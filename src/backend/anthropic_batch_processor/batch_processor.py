import json
import boto3
import anthropic
from datetime import datetime, timezone
from sqlalchemy import text, ARRAY, String, bindparam
from aws_utils import get_secret, logger, get_db_session, execute_query

TAG_LIST = {
  'Price': [
    # No AI-sourced price tags
  ],
  'Features': [
    'luxury',
    'renovated',
    'open-house',
    'furnished',
    'home-office',
    'spacious',
    'pre-war',
    'brownstone',
    'cozy',
    'high-ceilings',
    'natural-light'
  ],
  'Location': [
    'park-view',
    'up-and-coming',
    'quiet-neighborhood',
    'noisy-area',
    'waterfront',
    'restaurants-nearby'
    'gyms-nearby',
    'groceries-nearby',
    'parks-nearby'
  ],
  'Popularity': [
    # No AI-sourced popularity tags
  ],
  'Amenities': [
    'pet-friendly',
    'solar-powered',
    'eco-friendly',
    'energy-efficient',
    'modern-design',
    'classic-design',
    'gym',
    'pool',
    'rooftop-access',
    'concierge-service',
    'in-unit-laundry',
    'dishwasher',
    'doorman',
    'private-balcony',
    'shared-outdoor-space'
  ],
  'Transportation': [
    'close-to-bus-stop',
    'far-from-bus-stop',
    'close-to-subway',
    'far-from-subway',
    'bike-friendly',
    'parking-available'
  ]
}

def fetch_properties_without_summary(limit=1000):
    """
    Fetches property items from DynamoDB that don't have a description_summary field.
    Returns a list of dictionaries containing id and description for each property.
    
    Args:
        limit (int): Maximum number of items to return (defaults to 1000)
    
    Returns:
        list: List of dictionaries containing property data
    """
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('PropertyMediaDetails')
    
    # Use a scan operation with a filter expression to find items without description_summary
    logger.info("Scanning DynamoDB for properties without description_summary")
    response = table.scan(
        FilterExpression="attribute_not_exists(description_summary)",
        ProjectionExpression="id, description, loaded_datetime"
    )
    
    items = response['Items']
    
    # Handle pagination if there are more items and we haven't reached the limit
    while 'LastEvaluatedKey' in response and len(items) < limit:
        logger.info(f"Fetching more items, found {len(items)} so far")
        response = table.scan(
            FilterExpression="attribute_not_exists(description_summary)",
            ProjectionExpression="id, description, loaded_datetime",
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response['Items'])
        
        # Exit the loop if we've reached or exceeded the limit
        if len(items) >= limit:
            logger.info(f"Reached item limit of {limit}")
            # Trim excess items if we've gone over the limit
            items = items[:limit]
            break
    
    # Sort items by loaded_datetime if it exists in the items
    try:
        items = sorted(items, key=lambda x: x.get('loaded_datetime', ''), reverse=True)
        logger.info("Sorted items by loaded_datetime (newest first)")
    except Exception as e:
        logger.warning(f"Could not sort by loaded_datetime: {str(e)}")
    
    logger.info(f"Found {len(items)} properties without description_summary (limited to {limit})")
    return items

def create_batch():
    """
    Creates an Anthropic batch processing job for property descriptions.
    Returns batch information including batch_id, status, and request count.
    """
    logger.info("Creating Anthropic batch for property descriptions")
    
    # Get Anthropic API key from secrets
    API_KEYS = get_secret(secret_name='COAPTAPIKeys')
    ANTHROPIC_API_KEY = API_KEYS["anthropic_api_key"]
    
    # Fetch properties that need processing
    properties_list = fetch_properties_without_summary()
    
    # Limit batch size if needed (preventing excessive processing)
    properties_list = properties_list[:100]
    logger.info(f"Creating batch with {len(properties_list)} properties")
    
    # Create the Anthropic client and batch
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        message_batch = client.beta.messages.batches.create(
        requests=[
            {
                "custom_id": property['id'],
                "params": {
                    "model": "claude-3-5-haiku-20241022",
                    "max_tokens": 2000,
                    "temperature": 0.2,
                    "system": """You are an excellent real estate agent who's generating compelling but factually accurate and unbiased real estate description summaries, generating a list of tags from a predetermined list of tags based on a given description, and extracting any additional fees values like brokers fees ONLY IF EXPLICITLY MENTIONED. Do not leave out negative traits.""",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": """<example>
                                                <ideal_output>
                                                save_details({
                                                "input_description": "Full size outdoor terrace make this home a great space for entertaining or just enjoying the glorious private outdoor gardens! This beautiful home on Central Park South is a must see! With only two apartments on each floor, open your door to your own private oasis on Central Park! Welcome home to this well appointed residence with peaceful park views and an expansive, beautifully landscaped, approx. 832 sf, private patio out back. This home has been recently renovated with beautiful architecture and exquisite upgrades from the rich wood floors to the gorgeous tiled kitchen and dining areas. This home features a generous split floorplan with grand living room, primary bedroom suite and home office on one side with a guest bedroom suite and large kitchen/dining area that opens out to the outdoor patio. All throughout this lovely home is custom cabinetry and fine millwork, Crestron A/V system with recessed speakers (out in the garden, as well), and triple glazed windows for peace and quiet. Please note: outdoor space virtually staged 24 CPS is a boutique, full service cooperative with two apartments per floor, low maintenance that includes utilities, full time doorman and concierge, private storage, state-of-the-art fitness center and magnificent new lobby and entry. 1.5 month broker's fee applies, with an additional annual utility fee of $1,200 and one-time HOA fee of $500. There's also a 16% annual building fee.",
                                                "summary": "This recently renovated Central Park South cooperative features a spacious layout with two bedroom suites, a home office, and an impressive 832 sq ft private outdoor terrace with park views. The luxury residence includes custom cabinetry, fine millwork, Crestron A/V system, and triple-glazed windows, located in a boutique full-service building with doorman, concierge, and fitness center.",
                                                "tag_list": [
                                                    "luxury",
                                                    "renovated",
                                                    "home-office",
                                                    "spacious",
                                                    "park-view",
                                                    "quiet-neighborhood"
                                                ],
                                                "additional_fees": [
                                                    {
                                                        "name": "broker",
                                                        "amount": 1.5,
                                                        "type": "months",
                                                        "recurring": false
                                                    },
                                                    {
                                                        "name": "utility",
                                                        "amount": 100,
                                                        "type": "dollars",
                                                        "recurring": true
                                                    },
                                                    {
                                                        "name": "HOA",
                                                        "amount": 500,
                                                        "type": "dollars",
                                                        "recurring": false
                                                    },
                                                    {
                                                        "name": "building",
                                                        "amount": 16,
                                                        "type": "percentage",
                                                        "recurring": true
                                                    }
                                                ]
                                                })
                                                </ideal_output>
                                                <EXAMPLE_OF_FATAL_OUTPUT_AVOID_AT_ALL_COST>
                                                "input_description": "344 EAST 85TH STREET #5C\n\nABOUT THE APARTMENT: Washer/ Dryer, Stainless Kitchen, Dishwasher, Stainless Kitchen, Microwave, Sleek Fridge, Designer Bath, Kohler Pedestal Sink & Toilet, Soaking Tub, Tile & Marble Finishes, Sunny/Bright, Crown Moldings, Recessed Lighting Throughout\n\nABOUT THE BUILDING: Renovated Lobby, Beautiful Courtyard with Grills For a Nominal Annual Fee, Elevator, Laundry Room, Gorgeous Tree-Lined Block",
                                                "summary": "Charming apartment located on East 85th Street featuring modern amenities including in-unit washer/dryer, stainless steel kitchen appliances, and a designer bathroom with luxurious finishes. The building offers a renovated lobby, courtyard with grilling area, elevator, and is situated on a beautiful tree-lined block. Broker's fee applies",
                                                "tag_list": [
                                                    "renovated",
                                                    "spacious",
                                                    "luxury",
                                                    "pet-friendly"
                                                ],
                                                "additional_fees": [
                                                    {
                                                    "name": "courtyard grills",
                                                    "amount": null,
                                                    "type": "dollars",
                                                    "recurring": true
                                                    },
                                                {
                                                    "name": "broker",
                                                    "amount": 1,
                                                    "type": "months",
                                                    "recurring": false
                                                    }
                                                ]
                                                </EXAMPLE_OF_FATAL_OUTPUT_AVOID_AT_ALL_COST >

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
                            "name": "save_details",
                            "description": "Process a real estate description into a summarized description, a list of tags, and additional fees",
                            "cache_control": {"type": "ephemeral"},
                            "input_schema": {
                                "type": "object",
                                "properties": {
                                    "summary": {
                                    "type": "string",
                                    "description": "Summary of real estate description. If the input description is empty, return an empty string. If the description is extremely short, just clean it up."
                                    },
                                    "tag_list": {
                                    "type": "array",
                                    "items": {
                                        "type": "string"
                                    },
                                    "description": f"""List of tags that accurately describe the input description. 
                                        Tags should be selected from the following list: <TAG_LIST>\n{json.dumps(TAG_LIST, indent=2)}\n</TAG_LIST>
                                        If the input description is empty, return an empty array."""
                                    },
                                    "additional_fees": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                        "name": {
                                            "type": "string"
                                        },
                                        "amount": {
                                            "type": "number"
                                        },
                                        "type": {
                                            "type": "string",
                                            "enum": [
                                            "dollars",
                                            "percentage",
                                            "months"
                                            ]
                                        },
                                        "recurring": {
                                            "type": "boolean"
                                        }
                                        },
                                        "required": [
                                        "name",
                                        "amount",
                                        "type",
                                        "recurring"
                                        ]
                                    },
                                    "description": "CRITICALLY IMPORTANT: Return an array containing ONLY fees that have EXPLICIT NUMERICAL amounts stated in the description. Rules: 1) A fee MUST have an explicit numerical value in the description to be included. 2) NEVER include fees described as 'nominal' or with any non-numerical terms. 3) NEVER include fees where no specific amount is mentioned (e.g., 'broker fees apply' with no amount = DO NOT INCLUDE). 4) For discounts/free periods, include with positive numbers (e.g., '2 months free' = {name: 'rent-free', amount: 2, type: 'months'}). 5) For complementary items, use negative numbers to indicate value given to renter. 6) Convert annual fees to monthly (divide by 12). 7) Percentage values must be between 0-100. 8) If no fees with explicit numerical values exist, return an empty array []."
                                    },
                                    "input_description": {
                                    "type": "string",
                                    "description": "Input of real estate description"
                                    }
                                },
                                "required": [
                                    "summary",
                                    "tag_list",
                                    "additional_fees",
                                    "input_description"
                                ]
                            }
                        }
                    ]
                }
            }
            for property in properties_list
        ]
    )
    
        # Return batch information
        return {
            "batch_id": message_batch.id,
            "processing_status": message_batch.processing_status
        }
    except Exception as e:
        logger.error(f"Error creating Anthropic batch: {str(e)}")
        raise

def update_dynamodb_with_summary(property_summaries):
    """
    Update the PropertyMediaDetails DynamoDB table with generated summaries for multiple properties.
    Uses batch operations for better performance.
    
    Args:
        property_summaries (list): List of dictionaries containing property_id and summary
            [
                {"property_id": "123", "summary": "summary text 1"},
                {"property_id": "456", "summary": "summary text 2"}
            ]
    """
    if not property_summaries:
        logger.info("No property summaries to update")
        return
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('PropertyMediaDetails')
        current_time = datetime.now(timezone.utc).isoformat()
        
        # DynamoDB batch_write_item can process up to 25 items at once
        batch_size = 25
        success_count = 0
        
        # Process in batches of 25 items
        for i in range(0, len(property_summaries), batch_size):
            batch_items = property_summaries[i:i+batch_size]
            batch_requests = []
            
            for item in batch_items:
                property_id = item.get('property_id')
                summary = item.get('summary')
                
                if not property_id or not summary:
                    continue
                
                # Create update request for each item
                response = table.update_item(
                    Key={'id': property_id},
                    UpdateExpression="SET description_summary = :summary, updated_datetime = :updated_dt",
                    ExpressionAttributeValues={
                        ':summary': summary,
                        ':updated_dt': current_time
                    },
                    ReturnValues="UPDATED_NEW"
                )
                success_count += 1
            
            logger.info(f"Processed batch of {len(batch_items)} DynamoDB updates")
        
        logger.info(f"Successfully updated {success_count} properties in DynamoDB")
        return success_count
    except Exception as e:
        logger.error(f"Error updating DynamoDB with batch property summaries: {str(e)}")
        raise

def update_rds_with_tags(property_tags_data):
    """
    Update the real_estate.dim_property_details table with the generated tags for multiple properties in a single transaction.
    
    Args:
        property_tags_data (list): List of dictionaries containing property_id and tag_list for each property
    """
    if not property_tags_data:
        logger.info("No property tags data to update")
        return
    
    try:
        # Get a database session
        session = get_db_session()
        
        # Process each property in the same transaction
        for property_data in property_tags_data:
            property_id = property_data.get('property_id')
            tag_list = property_data.get('tag_list', [])
            tag_list = [str(tag) for tag in tag_list]
            
            if property_id and tag_list:
                logger.info(f"Updating RDS for property {property_id} with tags {tag_list}")
                
                # Simple update query using string formatting for the array
                query = """
                UPDATE real_estate.dim_property_details
                SET tag_list = array(
                    SELECT DISTINCT t
                    FROM unnest(tag_list || :tag_list) AS t
                )
                WHERE id = :property_id;
                """
                
                execute_query(session, query, {"tag_list": tag_list, "property_id": property_id})
        
        # Commit the transaction once for all updates
        session.commit()
        logger.info(f"Updated RDS for {len(property_tags_data)} properties with tags in a single transaction")
        
    except Exception as e:
        if 'session' in locals():
            session.rollback()
        logger.error(f"Error updating RDS with batch property tags: {str(e)}")
        raise
    finally:
        if 'session' in locals():
            session.close()

def process_completed_batch_results(message_batch):
    """
    Process the results of a completed Anthropic batch.
    Updates DynamoDB with summaries and RDS with tags.
    
    Args:
        message_batch: The Anthropic message batch object to process
    """
    logger.info(f"Processing completed batch results for batch ID: {message_batch.id}")
    
    try:
        # Get Anthropic API key from secrets
        API_KEYS = get_secret(secret_name='COAPTAPIKeys')
        ANTHROPIC_API_KEY = API_KEYS["anthropic_api_key"]
        
        # Create the Anthropic client
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        # Check if batch is complete
        if message_batch.processing_status != "ended":
            logger.warning(f"Batch {message_batch.id} is not complete. Status: {message_batch.processing_status}")
            return False
        
        # Get batch results directly using the SDK
        batch_results = client.beta.messages.batches.results(message_batch.id)
        
        # Collect all property data for batch processing
        property_tags_data = []
        property_summaries = []
        
        # Process each result
        for message in batch_results:
            try:
                # Get property ID from custom_id
                property_id = message.custom_id
                
                # Check if the message was successful
                if message.result.type == "succeeded":
                    # Extract tool use from the message
                    tool_uses = [content for content in message.result.message.content if content.type == "tool_use"]
                    
                    if tool_uses:
                        # Get the first tool use (should be process_description)
                        tool_use = tool_uses[0]
                        
                        # Extract summary and tag_list from tool input
                        summary = tool_use.input.get("summary", "")
                        tag_list = tool_use.input.get("tag_list", [])
                        
                        # Collect property summary data for batch update
                        property_summaries.append({
                            "property_id": property_id,
                            "summary": summary
                        })
                        
                        # Collect property tag data for batch update
                        property_tags_data.append({
                            "property_id": property_id,
                            "tag_list": tag_list
                        })
                    else:
                        logger.warning(f"No tool use found in message for property {property_id}")
                else:
                    logger.warning(f"Message for property {property_id} failed: {message.result.type}")
            except Exception as e:
                logger.error(f"Error processing message for property {property_id}: {str(e)}")

        # Update all property tags in RDS at once
        if property_tags_data:
            update_rds_with_tags(property_tags_data)
        
        # Update all property summaries in DynamoDB at once
        if property_summaries:
            update_dynamodb_with_summary(property_summaries)
        
        
        logger.info(f"Batch processing complete for batch ID: {message_batch.id} with {len(property_tags_data)}/{len(batch_results)}% success rate")
        return True
        
    except Exception as e:
        logger.error(f"Error processing batch results: {str(e)}")
        raise

def poll_anthropic_batch(batch_id):
    """
    Poll an Anthropic batch for status and process results if complete.
    Checks the status of the batch and automatically processes results when complete.
    
    Args:
        batch_id (str): The ID of the batch to check and potentially process
        
    Returns:
        dict: Batch information including completion and processing status
    """
    if not batch_id:
        logger.error("No batch_id provided for batch polling")
        raise ValueError("batch_id is required for polling Anthropic batch")
    
    logger.info(f"Polling Anthropic batch with ID: {batch_id}")
    
    # Get Anthropic API key from secrets
    API_KEYS = get_secret(secret_name='COAPTAPIKeys')
    ANTHROPIC_API_KEY = API_KEYS["anthropic_api_key"]
    
    # Create the Anthropic client and retrieve batch
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message_batch = client.beta.messages.batches.retrieve(batch_id)
        
        # Build response with batch information
        response = {
            "batch_id": message_batch.id,
            "processing_status": message_batch.processing_status,
            "is_complete": message_batch.processing_status == "ended"
        }
        
        # Log basic status information
        logger.info(f"Batch status: {message_batch.processing_status}")
        
        # If batch is complete, process the results
        if response["is_complete"]:
            logger.info(f"Batch {batch_id} is complete. Processing results...")
            try:
                process_completed_batch_results(message_batch)
                response["results_processed"] = True
            except Exception as e:
                logger.error(f"Error processing batch results: {str(e)}")
                response["results_processed"] = False
                response["processing_error"] = str(e)
        
        return response
    except Exception as e:
        logger.error(f"Error polling Anthropic batch: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    Lambda handler for AnthropicBatchProcessor.
    
    Parameters:
    - event (dict): Lambda event containing:
      - action (str): Action to perform ('create_batch' or 'check_status')
      - batch_id (str): Required for check_status action
    - context (LambdaContext): Lambda context object
    
    Returns:
    - dict: Response with statusCode and body
    
    Supported actions:
    - 'create_batch': Create a new batch processing job
    - 'check_status': Poll batch status and process results if complete
    """
    try:
        # Extract action and batch_id from event
        action = event.get("action", "create_batch")
        batch_id = event.get("batch_id")
        
        logger.info(f"AnthropicBatchProcessor invoked with action: {action}")
        
        # Handle different actions
        if action == "create_batch":
            result = create_batch()
            logger.info(f"Successfully created batch with ID: {result['batch_id']}")
            return {
                "statusCode": 200,
                "body": result
            }
        elif action == "check_status":
            if not batch_id:
                return {
                    "statusCode": 400,
                    "body": {"error": "batch_id is required for check_status action"}
                }
            
            result = poll_anthropic_batch(batch_id)
            return {
                "statusCode": 200,
                "body": result
            }
        else:
            return {
                "statusCode": 400,
                "body": {"error": f"Unsupported action: {action}"}
            }
            
    except Exception as e:
        logger.error(f"Error in AnthropicBatchProcessor: {str(e)}")
        return {
            "statusCode": 500,
            "body": {"error": str(e)}
        }
