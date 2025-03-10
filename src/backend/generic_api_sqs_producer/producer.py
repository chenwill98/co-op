import boto3
import json
import os
from urllib.parse import urljoin
from sqlalchemy import text
from typing import Literal
from aws_utils import get_secret, logger, get_db_session, execute_query

def fetch_api_payloads(api_type, listing_type: Literal['sales', 'rentals'] = 'rentals'):

    base_url = "https://streeteasy-api.p.rapidapi.com"
    headers = get_secret(secret_name='RapidAPIKey')

    # Checks to make sure that the listing_type makes for a valid endpoint
    if listing_type not in ['sales', 'rentals']:
        raise ValueError(f"Unsupported listing type: {listing_type}")
    listing_type_url = urljoin(base_url, f"{listing_type}/")

    # Add logic for each API type
    if api_type == "properties":
        neighborhoods_list = fetch_api_neighorhood_strings()
        properties_url = urljoin(listing_type_url, 'search')
        
        return [{"endpoint": properties_url, 
                "headers": headers,
                "params": {"areas":neighborhoods, 
                            "noFee":fees,
                            "limit":"500"}}
                for fees in ['false', 'true']
                for neighborhoods in neighborhoods_list]
    elif api_type == "property_details":
        property_ids = fetch_api_property_ids()

        return [{"endpoint": urljoin(listing_type_url, id), 
                 "headers":headers}
                 for id in property_ids]
    else:
        raise ValueError(f"Unsupported API type: {api_type}")
    

def fetch_api_neighorhood_strings():
    """
    Establishes a connection to the RDS table, and selects all neighborhoods that are just one level below
    the borough using SQLAlchemy.
    """
    try:
        # Get a SQLAlchemy session
        logger.info("Creating SQLAlchemy session")
        session = get_db_session()
        
        # Query the neighborhoods table
        logger.info("Querying neighborhoods data")
        query = "SELECT name FROM real_estate.neighborhoods_enhanced_view WHERE level=3;"
        result = execute_query(session, query)
        rows = result.fetchall()

        # Splits into large and small groups
        neighborhoods_list = [n[0].lower().replace(' ', '-').replace('.', '') for n in rows]

        large_neighborhoods_list = [n for n in neighborhoods_list if 'all-' in n or '-all' in n]
        small_neighborhoods_list = [n for n in neighborhoods_list if 'all-' not in n and '-all' not in n]
        api_neighborhoods_list = large_neighborhoods_list + [','.join(small_neighborhoods_list[i:i+10]) for i in range(0, len(small_neighborhoods_list), 10)]
        logger.info(f"fetchd {len(api_neighborhoods_list)} neighborhood batches")
        return api_neighborhoods_list

    except Exception as e:
        raise Exception(f"Error fetching neighborhood data from RDS: {e}")
    finally:
        if 'session' in locals():
            logger.info("Closing SQLAlchemy session")
            session.close()


def fetch_api_property_ids():
    """
    Establishes a connection to the RDS table, then fetches all property ids from fct_properties that either
    are missing details or have details that are a week old using SQLAlchemy.
    """
    try:
        # Get a SQLAlchemy session
        logger.info("Creating SQLAlchemy session")
        session = get_db_session()

        # Query the properties table
        logger.info("Querying property IDs that need details")
        query = """SELECT
                    fct_id
                    FROM real_estate.latest_property_details_view
                    WHERE id IS NULL
                    OR (loaded_datetime < NOW() - INTERVAL '7 days' AND price <> fct_price)
                    LIMIT 500;"""
        result = execute_query(session, query)
        rows = result.fetchall()

        return [n[0] for n in rows]

    except Exception as e:
        raise Exception(f"Error fetching IDs with old or without details data from RDS: {e}")
    finally:
        if 'session' in locals():
            logger.info("Closing SQLAlchemy session")
            session.close()


def lambda_handler(event, context):
    api_type = event["api_type"]
    try:
        payloads = fetch_api_payloads(api_type)

        sqs = boto3.client('sqs')
        queue_endpoints_dict = {
            'properties': os.getenv("PROPERTIES_API_URL"),
            'property_details': os.getenv("PROPERTY_DETAILS_API_URL"),
        }
        
        for payload in payloads:
            sqs.send_message(QueueUrl=queue_endpoints_dict[api_type], MessageBody=json.dumps(payload))
        return {"statusCode": 200, "body": f"Processed API type {api_type}"}
    except Exception as e:
        logger.error(f"Error processing API type {api_type}: {e}")
        raise