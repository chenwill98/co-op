import boto3
import json
import requests
import logging
import os
from urllib.parse import urljoin
from aws_utils import init_RDS_connection, get_secret, logger


def generate_api_payloads(api_type, listing_type='rentals'):

    base_url = "https://streeteasy-api.p.rapidapi.com"
    headers = get_secret(secret_name='RapidAPIKey')

    # Checks to make sure that the listing_type makes for a valid endpoint
    if listing_type not in ['sales', 'rentals']:
        raise ValueError(f"Unsupported listing type: {listing_type}")
    listing_type_url = urljoin(base_url, f"{listing_type}/")

    # Add logic for each API type
    if api_type == "properties":
        neighborhoods_list = generate_api_neighorhood_strings()
        properties_url = urljoin(listing_type_url, 'search')
        
        return [{"endpoint": properties_url, 
                "headers": headers,
                "params": {"areas":neighborhoods, 
                            "noFee":fees,
                            "limit":"500"}}
                for fees in ['false', 'true']
                for neighborhoods in neighborhoods_list]
    
    elif api_type == "property_details":
        property_ids = generate_api_property_ids()

        return [{"endpoint": urljoin(listing_type_url, id), 
                 "headers":headers}
                 for id in property_ids]
    else:
        raise ValueError(f"Unsupported API type: {api_type}")
    

def generate_api_neighorhood_strings():
    """
    Establishes a connection to the RDS table, and selects all neighborhoods that are just one level below
    the borough
    """
    connection = None
    try:
        logger.info("Attempting to connect to RDS")
        connection = init_RDS_connection()
        logger.info("Successfully connected to RDS")
        # Query the test_table
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM real_estate.neighborhoods_enhanced_view WHERE level=3;")
            rows = cursor.fetchall()

        # Splits into large and small groups
        neighborhoods_list = [n[0].lower().replace(' ', '-').replace('.', '') for n in rows]

        large_neighborhoods_list = [n for n in neighborhoods_list if 'all-' in n or '-all' in n]
        small_neighborhoods_list = [n for n in neighborhoods_list if 'all-' not in n and '-all' not in n]
        api_neighborhoods_list = large_neighborhoods_list + [','.join(small_neighborhoods_list[i:i+10]) for i in range(0, len(small_neighborhoods_list), 10)]
        return api_neighborhoods_list

    except Exception as e:
        raise Exception(f"Error fetching neighborhood data from RDS: {e}")
    finally:
        if connection:
            logger.info("Closing RDS connection")
            connection.close()


def generate_api_property_ids():
    """
    Establishes a connection to the RDS table, then fetches all property ids from fct_properties that either
    are missing details or have details that are a week old.
    """
    connection = None
    try:
        connection = init_RDS_connection()

        # Query the test_table
        with connection.cursor() as cursor:
            # Finds properties that either have no details, details that are a week old, or details that are out of date
            cursor.execute("""SELECT
                            fct_id
                            FROM real_estate.latest_property_details_view
                            WHERE id IS NULL
                            OR loaded_datetime < NOW() - INTERVAL '7 days'
                            OR price <> fct_price
                            LIMIT 500;""")
            rows = cursor.fetchall()

        return [n[0] for n in rows]

    except Exception as e:
        raise Exception(f"Error fetching IDs with old or without details data from RDS: {e}")
    finally:
        if connection:
            logger.info("Closing RDS connection")
            connection.close()


def lambda_handler(event, context):
    api_type = event["api_type"]
    payloads = generate_api_payloads(api_type)

    sqs = boto3.client('sqs')
    queue_endpoints_dict = {
        'properties': os.getenv("PROPERTIES_API_URL"),
        'property_details': os.getenv("PROPERTY_DETAILS_API_URL"),
    }
    try:
        for payload in payloads:
            sqs.send_message(QueueUrl=queue_endpoints_dict[api_type], MessageBody=json.dumps(payload))
        return {"statusCode": 200, "body": f"Processed API type {api_type}"}
    except Exception as e:
        logger.error(f"Error loading data into SQS Queue Endpoint {queue_endpoints_dict[api_type]}: {e}")
        raise