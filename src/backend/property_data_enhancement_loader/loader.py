import json
import requests
import anthropic
from sqlalchemy import text
import boto3
from aws_utils import get_secret, logger, get_db_session, execute_query

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

def fetch_api_payloads(api_type):
    API_KEYS = get_secret(secret_name='COAPTAPIKeys')

    # Add logic for each API type
    if api_type == "anthropic":
        properties_list = fetch_properties_without_summary()
        properties_list = properties_list[:1000]
        push_descriptions_to_anthropic(API_KEYS["anthropic_api_key"], properties_list)
    elif api_type == "subway":
        pass
    elif api_type == "mapbox":
        pass
    else:
        raise ValueError(f"Unsupported API type: {api_type}")

def fetch_properties_without_summary():
    """
    Fetches property items from DynamoDB that don't have a description_summary field.
    Returns a list of dictionaries containing id and description for each property.
    """
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('PropertyMediaDetails')
    
    # Use a scan operation with a filter expression to find items without description_summary
    logger.info("Scanning DynamoDB for properties without description_summary")
    response = table.scan(
        FilterExpression="attribute_not_exists(description_summary)",
        ProjectionExpression="id, description"
    )
    
    items = response['Items']
    
    # Handle pagination if there are more items
    while 'LastEvaluatedKey' in response:
        logger.info(f"Fetching more items, found {len(items)} so far")
        response = table.scan(
            FilterExpression="attribute_not_exists(description_summary)",
            ProjectionExpression="id, description",
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response['Items'])
    
    logger.info(f"Found {len(items)} properties without description_summary")
    return items

def push_descriptions_to_anthropic(ANTHROPIC_API_KEY, properties_list):

    client = anthropic.Anthropic(
      api_key=ANTHROPIC_API_KEY,
    )

    message_batch = client.beta.messages.batches.create(
        requests=[
            {
                "custom_id": property['id'],
                "params": {
                    "model": "claude-3-5-haiku-20241022",
                    "max_tokens": 1000,
                    "temperature": 0.5,
                    "system": "You are an excellent real estate agent who's generating compelling but factually accurate and unbiased real estate description summaries and generating a list of tags from a predetermined list of tags based on a given description. Do not leave out negative traits.",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": """<example>
                                                <ideal_output>
                                                process_description({
                                                "input_description": "Full size outdoor terrace make this home a great space for entertaining or just enjoying the glorious private outdoor gardens! This beautiful home on Central Park South is a must see! With only two apartments on each floor, open your door to your own private oasis on Central Park! Welcome home to this well appointed residence with peaceful park views and an expansive, beautifully landscaped, approx. 832 sf, private patio out back. This home has been recently renovated with beautiful architecture and exquisite upgrades from the rich wood floors to the gorgeous tiled kitchen and dining areas. This home features a generous split floorplan with grand living room, primary bedroom suite and home office on one side with a guest bedroom suite and large kitchen/dining area that opens out to the outdoor patio. All throughout this lovely home is custom cabinetry and fine millwork, Crestron A/V system with recessed speakers (out in the garden, as well), and triple glazed windows for peace and quiet. Please note: outdoor space virtually staged 24 CPS is a boutique, full service cooperative with two apartments per floor, low maintenance that includes utilities, full time doorman and concierge, private storage, state-of-the-art fitness center and magnificent new lobby and entry.",
                                                "summary": "This recently renovated Central Park South cooperative features a spacious layout with two bedroom suites, a home office, and an impressive 832 sq ft private outdoor terrace with park views. The luxury residence includes custom cabinetry, fine millwork, Crestron A/V system, and triple-glazed windows, located in a boutique full-service building with doorman, concierge, and fitness center.",
                                                "tag_list": [
                                                    "luxury",
                                                    "renovated",
                                                    "home-office",
                                                    "spacious",
                                                    "park-view",
                                                    "quiet-neighborhood",
                                                    "new"
                                                ]
                                                })
                                                </ideal_output>
                                                </example>""",
                                    "cache_control": {"type": "ephemeral"}
                                },
                                {
                                    "type": "text",
                                    "text": f"<input_description>{property['description']}</input_description>"
                                }
                            ]
                        }
                    ],
                    "tools": [
                        {
                            "name": "process_description",
                            "description": "Process a real estate description into a summarized description and a list of tags",
                            "cache_control": {"type": "ephemeral"},
                            "input_schema": {
                                "type": "object",
                                "required": [
                                    "summary",
                                    "tag_list",
                                    "input_description"
                                ],
                                "properties": {
                                    "input_description": {
                                        "type": "string",
                                        "description": "Input of real estate description"
                                    },
                                    "summary": {
                                        "type": "string",
                                        "description": "Summary of real estate description"
                                    },
                                    "tag_list": {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        },
                                        "description": f"""List of tags that accurately describe the input description. 
                                        Tags should be selected from the following list: <TAG_LIST>\n{json.dumps(TAG_LIST, indent=2)}\n</TAG_LIST>"""
                                    }
                                }
                            }
                        }
                    ]
                }
            }
            for property in properties_list
        ]
    )
    logger.info(message_batch)
    return message_batch


def lambda_handler(event, context):
    """
    AWS Lambda handler function that processes the event and triggers the appropriate API calls.
    """
    api_type = event["api_type"]
    try:
        result = fetch_api_payloads(api_type)
        return {
            "statusCode": 200,
            "body": f"Successfully processed {api_type} API request"
        }
    except Exception as e:
        logger.error(f"Error processing {api_type} API request: {e}")
        return {
            "statusCode": 500,
            "body": f"Error processing {api_type} API request: {str(e)}"
        }

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
        
        for listing in listings:
            data_dict = {
                'id': listing["id"],
                'price': listing["price"],
                'longitude': listing["longitude"],
                'latitude': listing["latitude"],
                'url': listing["url"],
            }
            
            # Use the execute_query helper function
            execute_query(session, upsert_query, data_dict)
        
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