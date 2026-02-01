import json
import requests
import boto3
from datetime import datetime, timezone
from sqlalchemy import text
from aws_utils import logger, get_db_session, execute_query

def upsert_property_details_to_rds(session, listings):
    """
    Upsert a batch of listings into the real_estate.dim_property_details table.
    """
    upsert_query = """
        INSERT INTO real_estate.dim_property_details (
            id, status, listed_at, closed_at, days_on_market, available_from,
            address, price, borough, neighborhood, zipcode, property_type,
            sqft, bedrooms, bathrooms, type, latitude, longitude, amenities,
            built_in, building_id, agents, no_fee, thumbnail_image
        )
        VALUES (
            :id, :status, :listed_at, :closed_at, :days_on_market, :available_from,
            :address, :price, :borough, :neighborhood, :zipcode, :property_type,
            :sqft, :bedrooms, :bathrooms, :type, :latitude, :longitude,
            :amenities, :built_in, :building_id, :agents, :no_fee, :thumbnail_image
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
            thumbnail_image = EXCLUDED.thumbnail_image,
            loaded_datetime = EXCLUDED.loaded_datetime;
    """

    try:
        # Create parameters list for executemany
        params_list = []
        
        for listing in listings:
            # Convert Python lists to PostgreSQL array format with null checks
            amenities = listing.get("amenities") or []
            agents = listing.get("agents") or []
            amenities_array = "{" + ",".join(f'"{item}"' for item in amenities) + "}" if amenities else "{}"
            agents_array = "{" + ",".join(f'"{item}"' for item in agents) + "}" if agents else "{}"
            
            # Safely extract building_id with null check
            building = listing.get("building")
            building_id = building.get("id") if building else None

            # Safely extract thumbnail_image
            images = listing.get("images")
            thumbnail_image = images[0] if images and len(images) > 0 else None

            params_list.append({
                'id': listing.get("id"),
                'status': listing.get("status"),
                'listed_at': listing.get("listedAt"),
                'closed_at': listing.get("closedAt"),
                'days_on_market': listing.get("daysOnMarket"),
                'available_from': listing.get("availableFrom"),
                'address': listing.get("address"),
                'price': listing.get("price"),
                'borough': listing.get("borough"),
                'neighborhood': listing.get("neighborhood"),
                'zipcode': listing.get("zipcode"),
                'property_type': listing.get("propertyType"),
                'sqft': listing.get("sqft"),
                'bedrooms': listing.get("bedrooms"),
                'bathrooms': listing.get("bathrooms"),
                'type': listing.get("type"),
                'latitude': listing.get("latitude"),
                'longitude': listing.get("longitude"),
                'amenities': amenities_array,
                'built_in': listing.get("builtIn"),
                'building_id': building_id,
                'agents': agents_array,
                'no_fee': listing.get("noFee"),
                'thumbnail_image': thumbnail_image,
            })
        
        # Execute a batch insert with executemany
        if params_list:
            session.execute(text(upsert_query).execution_options(autocommit=False), params_list)
        
        session.commit()
        logger.info(f"Successfully upserted {len(listings)} listings to dim_property_details")
    except Exception as e:
        session.rollback()
        logger.error(f"Error upserting to dim_property_details: {e}")
        raise


def upsert_property_media_details_to_dynamodb(listings):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('PropertyMediaDetails')

    for listing in listings:
        table.put_item(
            Item={
                'id': listing.get('id'),
                'description': listing.get('description', ''),
                'images': listing.get('images', []),
                'videos': listing.get('videos', []),
                'floorplans': listing.get('floorplans', []),
                'loaded_datetime': datetime.now(timezone.utc).isoformat()
            }
        )

def fetch_and_store_data(message_list):
    """
    Fetch data from the given API URL, handle pagination, and store results in RDS.
    """
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
            logger.error(f"Error fetching {message}: {e}")
            raise

    try:
        # Get a SQLAlchemy session
        logger.info("Creating SQLAlchemy session")
        session = get_db_session()
        
        logger.info(f"Inserting {len(property_details_list)} messages into dim_property_details")
        upsert_property_details_to_rds(session, property_details_list)

        logger.info(f"Inserting {len(property_details_list)} messages into DynamoDB table PropertyMediaDetails")
        upsert_property_media_details_to_dynamodb(property_details_list)

    except Exception as e:
        logger.error(f"Error upserting property details: {e}")
        raise
    
    finally:
        if 'session' in locals():
            logger.info("Closing SQLAlchemy session")
            session.close()


def lambda_handler(event, context):
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