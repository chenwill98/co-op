"""
Migrate PropertyMediaDetails from DynamoDB to PostgreSQL dim_property_details.

Reads all items from the DynamoDB PropertyMediaDetails table via paginated SCAN
and UPDATEs the corresponding rows in PostgreSQL with description, description_summary,
images, videos, and floorplans.

Usage:
    cd src/backend && source venv/bin/activate
    python scripts/migrate_dynamodb_to_postgres.py

    # Resume from a previous run:
    python scripts/migrate_dynamodb_to_postgres.py --resume

    # Dry-run (scan only, no writes):
    python scripts/migrate_dynamodb_to_postgres.py --dry-run
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import boto3
from sqlalchemy import text

# Add the layers directory so we can import aws_utils
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'layers', 'aws_utils'))
from aws_utils import get_db_session, logger

RESUME_FILE = os.path.join(os.path.dirname(__file__), '.migrate_resume_key.json')
BATCH_SIZE = 500
LOG_INTERVAL = 1000


def save_resume_key(last_evaluated_key, total_processed):
    """Save the last evaluated key and progress to disk for resumability."""
    with open(RESUME_FILE, 'w') as f:
        json.dump({
            'last_evaluated_key': last_evaluated_key,
            'total_processed': total_processed,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }, f)


def load_resume_key():
    """Load the last evaluated key from disk if it exists."""
    if not os.path.exists(RESUME_FILE):
        return None, 0
    with open(RESUME_FILE, 'r') as f:
        data = json.load(f)
    return data.get('last_evaluated_key'), data.get('total_processed', 0)


def batch_update_postgres(session, items):
    """
    Update PostgreSQL dim_property_details with media fields from DynamoDB items.
    Uses individual UPDATE statements in a single transaction for reliability.
    """
    query = text("""
        UPDATE real_estate.dim_property_details
        SET description = :description,
            description_summary = :description_summary,
            images = :images,
            videos = :videos,
            floorplans = :floorplans
        WHERE id = :id
          AND description IS NULL
    """)

    update_count = 0
    for item in items:
        prop_id = item.get('id')
        if not prop_id:
            continue

        # Handle legacy field name: ai_summary → description_summary
        summary = item.get('description_summary') or item.get('ai_summary') or None

        # Format arrays for PostgreSQL
        images = item.get('images') or []
        videos = item.get('videos') or []
        floorplans = item.get('floorplans') or []

        images_pg = '{' + ','.join('"' + str(i).replace('"', '\\"') + '"' for i in images) + '}' if images else '{}'
        videos_pg = '{' + ','.join('"' + str(v).replace('"', '\\"') + '"' for v in videos) + '}' if videos else '{}'
        floorplans_pg = '{' + ','.join('"' + str(f).replace('"', '\\"') + '"' for f in floorplans) + '}' if floorplans else '{}'

        session.execute(query, {
            'id': prop_id,
            'description': item.get('description') or None,
            'description_summary': summary,
            'images': images_pg,
            'videos': videos_pg,
            'floorplans': floorplans_pg,
        })
        update_count += 1

    session.commit()
    return update_count


def run_migration(dry_run=False, resume=False):
    """Main migration loop: scan DynamoDB → batch update PostgreSQL."""
    dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
    table = dynamodb.Table('PropertyMediaDetails')

    # Get approximate item count for progress tracking
    table.reload()
    approx_total = table.item_count  # DynamoDB updates this ~every 6 hours

    # Resume support
    start_key = None
    total_processed = 0
    if resume:
        start_key, total_processed = load_resume_key()
        if start_key:
            logger.info(f"Resuming from previous run at item {total_processed}")
        else:
            logger.info("No resume file found, starting from beginning")

    # Get PostgreSQL session
    session = None
    if not dry_run:
        session = get_db_session()

    total_updated = 0
    batch_buffer = []
    start_time = time.time()
    last_log_time = start_time

    logger.info(f"Starting migration (dry_run={dry_run}, approx_total=~{approx_total:,})")

    try:
        # Build scan kwargs
        scan_kwargs = {
            'ProjectionExpression': 'id, description, description_summary, ai_summary, images, videos, floorplans',
        }

        has_more = True
        while has_more:
            if start_key:
                scan_kwargs['ExclusiveStartKey'] = start_key

            response = table.scan(**scan_kwargs)
            items = response.get('Items', [])

            for item in items:
                batch_buffer.append(item)
                total_processed += 1

                # Flush batch when full
                if len(batch_buffer) >= BATCH_SIZE:
                    if not dry_run:
                        updated = batch_update_postgres(session, batch_buffer)
                        total_updated += updated
                    batch_buffer = []

                # Log progress at intervals
                if total_processed % LOG_INTERVAL == 0:
                    elapsed = time.time() - start_time
                    rate = total_processed / elapsed if elapsed > 0 else 0
                    eta_seconds = (approx_total - total_processed) / rate if rate > 0 else 0
                    eta_h = int(eta_seconds // 3600)
                    eta_m = int((eta_seconds % 3600) // 60)
                    pct = (total_processed / approx_total * 100) if approx_total > 0 else 0
                    print(
                        f"[{total_processed:,} / ~{approx_total:,}] "
                        f"{pct:.1f}% — {rate:.0f} items/sec — "
                        f"ETA: ~{eta_h}h {eta_m}m — "
                        f"updated: {total_updated:,}",
                        flush=True,
                    )
                    # Save resume key periodically
                    if start_key:
                        save_resume_key(start_key, total_processed)

            # Check for more pages
            start_key = response.get('LastEvaluatedKey')
            has_more = start_key is not None

        # Flush remaining items
        if batch_buffer and not dry_run:
            updated = batch_update_postgres(session, batch_buffer)
            total_updated += updated

        elapsed = time.time() - start_time
        logger.info(
            f"Migration complete: processed {total_processed:,} items, "
            f"updated {total_updated:,} rows in {elapsed:.0f}s"
        )

        # Clean up resume file on success
        if os.path.exists(RESUME_FILE):
            os.remove(RESUME_FILE)

    except Exception:
        # Save resume key on failure so we can pick up where we left off
        if start_key:
            save_resume_key(start_key, total_processed)
            logger.info(f"Resume key saved at item {total_processed}")
        raise
    finally:
        if session:
            session.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Migrate PropertyMediaDetails from DynamoDB to PostgreSQL')
    parser.add_argument('--dry-run', action='store_true', help='Scan only, no writes')
    parser.add_argument('--resume', action='store_true', help='Resume from last saved position')
    args = parser.parse_args()

    run_migration(dry_run=args.dry_run, resume=args.resume)
