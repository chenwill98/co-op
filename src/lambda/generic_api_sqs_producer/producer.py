import boto3
import json
import requests
import logging
import os
from aws_utils import generate_RDS_connection, get_secret, logger


def generate_api_payloads(api_type):

    url = "https://streeteasy-api.p.rapidapi.com/"
    headers = get_secret(secret_name='RapidAPIKey')

    # Add logic for each API type
    if api_type == "properties":
        neighborhoods_list = generate_api_neighorhood_strings()
        properties_url = url + "rentals/search"
        
        return [{"endpoint": properties_url, 
                "headers": headers,
                "params": {"areas":neighborhoods, 
                            "noFee":fees,
                            "limit":"500"}}
                for fees in ['false', 'true']
                for neighborhoods in neighborhoods_list]
    
    elif api_type == "property_details":
        property_details_url = url + "rentals"
        return [{"endpoint": property_details_url, 
                 "headers":headers}]
    else:
        raise ValueError(f"Unsupported API type: {api_type}")
    

def generate_api_neighorhood_strings():
    connection = None
    try:
        logger.info("Attempting to connect to RDS")
        connection = generate_RDS_connection()
        logger.info("Successfully connected to RDS")
        # Query the test_table
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM real_estate.neighborhoods_enhanced_view WHERE level=3;")
            rows = cursor.fetchall()

        # Splits into large and small groups
        neighborhoods_list = [n[0].lower().replace(' ', '-') for n in rows]

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