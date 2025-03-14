import json
import requests
from sqlalchemy import text
import boto3
from aws_utils import get_secret, logger, get_db_session, execute_query

# Anthropic is now handled by the dedicated AnthropicBatchProcessor Lambda

TAG_LIST = {
  'Price': [
    'price-drop',
    'great-deal',
    'price-increase',
    'discounted',
    'underpriced'
  ],
  'Features': [
    'luxury',
    'renovated',
    'open-house',
    'furnished',
    'home-office',
    'pet-friendly',
    'spacious',
    'cozy'
  ],
  'Location': [
    'near-subway',
    'park-view',
    'city-center',
    'quiet-neighborhood',
    'waterfront'
  ],
  'Popularity': [
    'new',
    'popular',
    'short-term',
    'trending'
  ],
  'Amenities': [
    'solar-powered',
    'eco-friendly',
    'modern-design',
    'gym',
    'pool',
    'rooftop-access',
    'concierge-service'
  ],
  'Transportation': [
    'walk-score-high',
    'close-to-bus-stop',
    'close-to-train-station',
    'bike-friendly'
  ]
}

def fetch_api_payloads(api_type, batch_id=None):
    API_KEYS = get_secret(secret_name='COAPTAPIKeys')
    
    if api_type == "subway":
        pass
    elif api_type == "mapbox":
        pass
    else:
        raise ValueError(f"Unsupported API type: {api_type}")

def lambda_handler(event, context):
    api_type = event["api_type"]
    batch_id = event.get("batch_id")  # Get batch_id if provided
    
    try:
        result = fetch_api_payloads(api_type, batch_id)
        # If result is returned (from loader functions), return it
        if result is not None:
            return {"statusCode": 200, "body": result}
            
    except Exception as e:
        logger.error(f"Error processing api type {api_type}: {e}")
        raise

# def upsert_properties_to_rds(session, listings):
#     """
#     Upsert a batch of listings into the real_estate.fct_properties table.
#     """
#     # Delete query (commented out in original)
#     # delete_query = """
#     #     DELETE FROM real_estate.fct_properties
#     #     WHERE "date" = CURRENT_DATE;
#     # """

#     upsert_query = """
#         INSERT INTO real_estate.fct_properties (id, price, longitude, latitude, url, "date")
#         VALUES (:id, :price, :longitude, :latitude, :url, CURRENT_DATE)
#         ON CONFLICT (id, "date") DO UPDATE SET
#             price = EXCLUDED.price,
#             longitude = EXCLUDED.longitude,
#             latitude = EXCLUDED.latitude,
#             url = EXCLUDED.url;
#     """

#     try:
#         # Uncomment if needed
#         # execute_query(session, delete_query)
#         # session.commit()
        
#         logger.info(f"Inserting {len(listings)} into real_estate.fct_properties Table")
        
#         for listing in listings:
#             data_dict = {
#                 'id': listing["id"],
#                 'price': listing["price"],
#                 'longitude': listing["longitude"],
#                 'latitude': listing["latitude"],
#                 'url': listing["url"],
#             }
            
#             # Use the execute_query helper function
#             execute_query(session, upsert_query, data_dict)
        
#         session.commit()
#         logger.info(f"Successfully upserted {len(listings)} listings to fct_properties")
#     except Exception as e:
#         session.rollback()
#         logger.error(f"Error upserting to fct_properties: {e}")
#         raise

# def fetch_and_store_data(message_list):
#     """
#     Fetch data from the given API URL, handle pagination, and store results in RDS.
#     """
#     properties_list = []
#     for i, message in enumerate(message_list):
#         logger.info(f"Processing message {i+1} of {len(message_list)}")
#         try:
#             offset = 0
#             while True:
#                 params = message['params']
#                 params['offset'] = offset

#                 logger.info(f"Making call with {params['areas']}")
#                 response = requests.get(message['endpoint'], headers=message['headers'], params=params)
#                 response.raise_for_status()
#                 data = response.json()

#                 listings = data.get("listings", [])
#                 logger.info(f"Fetched {len(listings)} listings")
#                 if listings:
#                     properties_list.extend(listings)
                    

#                 pagination = data.get("pagination", {})
#                 next_offset = pagination.get("nextOffset")

#                 # If there's no nextOffset or no new offset to move to, break the loop
#                 if not next_offset or next_offset <= offset:
#                     break
#                 logger.info(f"Setting offset to {next_offset}")
#                 offset = next_offset

#         except Exception as e:
#             logger.info(f"Error processing {message}: {e}")
#             raise

#     try:
#         # Get a SQLAlchemy session
#         logger.info("Creating SQLAlchemy session")
#         session = get_db_session()

#         logger.info(f"Inserting {len(properties_list)} into real_estate.fct_properties Table")
#         upsert_properties_to_rds(session, properties_list)

#     except Exception as e:
#         logger.info(f"Error upserting properties: {e}")
#         raise
    
#     finally:
#         if 'session' in locals():
#             logger.info("Closing SQLAlchemy session")
#             session.close()