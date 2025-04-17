import json
import requests
from sqlalchemy import text
from aws_utils import logger, get_db_session, execute_query

def upsert_properties_to_rds(session, listings):
    """
    Upsert a batch of listings into the real_estate.fct_properties table.
    """
    # Delete query (commented out in original)
    # delete_query = """
    #     DELETE FROM real_estate.fct_properties
    #     WHERE "date" = CURRENT_DATE;
    # """

    upsert_query = """
        INSERT INTO real_estate.fct_properties (id, price, longitude, latitude, url, "date")
        VALUES (:id, :price, :longitude, :latitude, :url, CURRENT_DATE)
        ON CONFLICT (id, "date") DO UPDATE SET
            price = EXCLUDED.price,
            longitude = EXCLUDED.longitude,
            latitude = EXCLUDED.latitude,
            url = EXCLUDED.url;
    """

    try:
        # Uncomment if needed
        # execute_query(session, delete_query)
        # session.commit()
        
        logger.info(f"Inserting {len(listings)} into real_estate.fct_properties Table")
        
        # Create parameters list for executemany
        params_list = []
        for listing in listings:
            params_list.append({
                'id': listing["id"],
                'price': listing["price"],
                'longitude': listing["longitude"],
                'latitude': listing["latitude"],
                'url': listing["url"],
            })
        
        # Execute a batch insert with executemany
        if params_list:
            session.execute(text(upsert_query).execution_options(autocommit=False), params_list)
        
        session.commit()
        logger.info(f"Successfully upserted {len(listings)} listings to fct_properties")
    except Exception as e:
        session.rollback()
        logger.error(f"Error upserting to fct_properties: {e}")
        raise

def fetch_and_store_data(message_list):
    """
    Fetch data from the given API URL, handle pagination, and store results in RDS.
    """
    properties_list = []
    for i, message in enumerate(message_list):
        logger.info(f"Processing message {i+1} of {len(message_list)}")
        try:
            offset = 0
            while True:
                params = message['params']
                params['offset'] = offset

                logger.info(f"Making call with {params['areas']}")
                response = requests.get(message['endpoint'], headers=message['headers'], params=params)
                response.raise_for_status()
                data = response.json()

                listings = data.get("listings", [])
                logger.info(f"Fetched {len(listings)} listings")
                if listings:
                    properties_list.extend(listings)
                    

                pagination = data.get("pagination", {})
                next_offset = pagination.get("nextOffset")

                # If there's no nextOffset or no new offset to move to, break the loop
                if not next_offset or next_offset <= offset:
                    break
                logger.info(f"Setting offset to {next_offset}")
                offset = next_offset

        except Exception as e:
            logger.info(f"Error processing {message}: {e}")
            raise

    try:
        # Get a SQLAlchemy session
        logger.info("Creating SQLAlchemy session")
        session = get_db_session()

        logger.info(f"Inserting {len(properties_list)} into real_estate.fct_properties Table")
        upsert_properties_to_rds(session, properties_list)

    except Exception as e:
        logger.info(f"Error upserting properties: {e}")
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
        logger.error(f"Error processing messages: {e}")
        raise