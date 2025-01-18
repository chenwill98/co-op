import json
import requests
from aws_utils import init_RDS_connection, logger

def upsert_properties_to_rds(connection, listings):
    """
    Upsert a batch of listings into the real_estate.properties table.
    """
    upsert_query = """
        INSERT INTO real_estate.fct_properties (id, price, longitude, latitude, url, entered_at)
        VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
            price = EXCLUDED.price,
            longitude = EXCLUDED.longitude,
            latitude = EXCLUDED.latitude,
            url = EXCLUDED.url,
            entered_at = EXCLUDED.entered_at;
        """

    data_list = []
    for listing in listings:
        data_tuple = (
            listing["id"],
            listing["price"],
            listing["longitude"],
            listing["latitude"],
            listing["url"],
        )
        data_list.append(data_tuple)

    with connection.cursor() as cursor:
        cursor.executemany(upsert_query, data_list)
        connection.commit()


def fetch_and_store_data(message_list):
    """
    Fetch data from the given API URL, handle pagination, and store results in RDS.
    """
    connection = None

    properties_list = []
    for i, message in enumerate(message_list):
        logger.info(f"Processing message {i} of {len(message_list)}")
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
                if listings:
                    properties_list.append(listings)
                    

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
        connection = init_RDS_connection()

        logger.info(f"Inserting {len(properties_list)} into real_estate.properties Table")
        upsert_properties_to_rds(connection, properties_list)

    except Exception as e:
        logger.info(f"Error upserting properties: {e}")
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