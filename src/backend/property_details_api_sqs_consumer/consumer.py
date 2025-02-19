import json
import requests
import boto3
from datetime import datetime, timezone
from aws_utils import init_RDS_connection, logger

def upsert_property_details_to_rds(connection, listings):
    """
    Upsert a batch of listings into the real_estate.properties table.
    """
    upsert_query = """
        INSERT INTO real_estate.dim_property_details (
            id, status, listed_at, closed_at, days_on_market, available_from,
            address, price, borough, neighborhood, zipcode, property_type,
            sqft, bedrooms, bathrooms, type, latitude, longitude, amenities,
            built_in, building_id, agents, no_fee, thumbnail_image
        )
        VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            listed_at = EXCLUDED.listed_at,
            closed_at = EXCLUDED.closed_at,
            days_on_market = EXCLUDED.days_on_market,
            available_from = EXCLUDED.available_from,
            address = EXCLUDED.address,
            price = EXCLUDED.price,
            borough = EXCLUDED.borough,
            neighborhood = EXCLUDED.neighborhood,
            zipcode = EXCLUDED.zipcode,
            property_type = EXCLUDED.property_type,
            sqft = EXCLUDED.sqft,
            bedrooms = EXCLUDED.bedrooms,
            bathrooms = EXCLUDED.bathrooms,
            type = EXCLUDED.type,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            amenities = EXCLUDED.amenities,
            built_in = EXCLUDED.built_in,
            building_id = EXCLUDED.building_id,
            agents = EXCLUDED.agents,
            no_fee = EXCLUDED.no_fee,
            thumbnail_image = EXCLUDED.thumbnail_image;
    """

    data_list = []
    for listing in listings:
        data_tuple = (
            listing["id"],
            listing["status"],
            listing["listedAt"],
            listing["closedAt"],
            listing["daysOnMarket"],
            listing["availableFrom"],
            listing["address"],
            listing["price"],
            listing["borough"],
            listing["neighborhood"],
            listing["zipcode"],
            listing["propertyType"],
            listing["sqft"],
            listing["bedrooms"],
            listing["bathrooms"],
            listing["type"],
            listing["latitude"],
            listing["longitude"],
            listing["amenities"],
            listing["builtIn"],
            listing["building"]["id"],
            listing["agents"],
            listing["noFee"],
            listing["images"][0],
        )
        data_list.append(data_tuple)

    with connection.cursor() as cursor:
        cursor.executemany(upsert_query, data_list)
        connection.commit()


def upsert_property_media_details_to_dynamodb(listings):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('PropertyMediaDetails')
    
    for listing in listings:
        table.put_item(
            Item={
                'id': listing['id'],
                'description': listing['description'],
                'images': listing['images'],
                'videos': listing['videos'],
                'floorplans': listing['floorplans'],
                'loaded_datetime': datetime.now(timezone.utc).isoformat()
            }
        )


def fetch_and_store_data(message_list):
    """
    Fetch data from the given API URL, handle pagination, and store results in RDS.
    """
    connection = None

    property_details_list = []
    for i, message in enumerate(message_list):
        logger.info(f"Processing message {i} of {len(message_list)}")
        try:
            response = requests.get(message['endpoint'], headers=message['headers'])
            response.raise_for_status()
            data = response.json()

            if data:
                property_details_list.append(data)

        except Exception as e:
            logger.info(f"Error fetching {message}: {e}")
            raise

    try:
        connection = init_RDS_connection()

        logger.info(f"Inserting {len(property_details_list)} messages into dim_property_details")
        upsert_property_details_to_rds(connection, property_details_list)

        logger.info(f"Inserting {len(property_details_list)} messages into DynamoDB table PropertyMediaDetails")
        upsert_property_media_details_to_dynamodb(property_details_list)

    except Exception as e:
        logger.info(f"Error upserting property details: {e}")
        raise
    
    finally:
        if connection:
            logger.info("Closing RDS connection")
            connection.close()


def lambda_handler(event, context):
    """
    AWS Lambda handler, triggered by SQS messages.
    """
    message_list = []
    for record in event["Records"]:
        message_body = json.loads(record["body"])
        message_list.append(message_body)
    
    try:
        logger.info(f"{len(message_list)} messages received. Processing:")
        fetch_and_store_data(message_list)
        return {"statusCode": 200, "body": "Messages processed successfully"}
    except Exception as e:
        logger.error(f"Error processing property details messages: {e}")
        raise

