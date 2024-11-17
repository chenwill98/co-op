import json
import requests
from sqlalchemy import create_engine, Table, MetaData

# Configure RDS connection
DB_URI = "postgresql://username:password@your-rds-endpoint:5432/yourdatabase"  # Replace with your RDS details
engine = create_engine(DB_URI)

# Load the existing table
metadata = MetaData()
metadata.reflect(bind=engine)
properties_table = Table("properties", metadata, autoload_with=engine, schema="real_estate")

def process_message(message_body):
    """
    Processes a single message from the queue.
    """
    try:
        api_url = message_body.get("api_url")
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()

        with engine.begin() as conn:
            for item in data:
                conn.execute(
                    properties_table.insert().values(
                        id=item["id"],
                        price=item["price"],
                        type=item["type"],
                        longitude=item["longitude"],
                        latitude=item["latitude"],
                        url=item["url"]
                    ).on_conflict_do_update(
                        index_elements=["id"],
                        set_={
                            "price": item["price"],
                            "type": item["type"],
                            "longitude": item["longitude"],
                            "latitude": item["latitude"],
                            "url": item["url"]
                        }
                    )
                )
        print(f"Processed data: {data}")
    except Exception as e:
        print(f"Error processing message: {e}")

def lambda_handler(event, context):
    """
    AWS Lambda handler function.
    Triggered by SQS messages.
    """
    for record in event['Records']:
        message_body = json.loads(record['body'])
        process_message(message_body)
    return {"statusCode": 200, "body": "Messages processed successfully"}