
import boto3
import json
from airflow.utils.log.logging_mixin import LoggingMixin

# Create a boto3 Lambda client with region specified
lambda_client = boto3.client("lambda", region_name="us-east-2")

# Initialize Airflow's logger
logger = LoggingMixin().log

def check_processing_status(check_type, **kwargs):
    """
    Check if data processing is complete by calling the DataProcessingChecker Lambda.
    Returns True if processing is complete (status is COMPLETE), False if still in progress (status is PENDING).
    Raises an exception if there's an error or unexpected status.
    
    Args:
        check_type (str): Type of check to perform, e.g., "fct_properties", "dim_property_details"
        **kwargs: Additional arguments to pass to the Lambda function
        
    Returns:
        bool: True if processing is complete (status is COMPLETE), False if still in progress (status is PENDING)
        
    Raises:
        Exception: If the Lambda function returns an error or unexpected status
    """
    # Log the check
    logger.info(f"Checking processing status for {check_type}...")
    
    response = lambda_client.invoke(
        FunctionName="DataProcessingChecker",
        InvocationType="RequestResponse",  # Synchronous to get the response
        Payload=json.dumps({"check_type": check_type}),
    )
    
    # Parse the response payload
    response_payload = json.loads(response['Payload'].read().decode())
    logger.info(f"Processing status response: {response_payload}")
    
    # Check if the Lambda function returned a valid response
    if response_payload.get('statusCode') != 200:
        error_msg = f"Data processing checker failed with status code {response_payload.get('statusCode')}"
        logger.error(error_msg)
        raise Exception(error_msg)
    
    # Get the body of the response
    body = response_payload.get('body', {})
    
    # Handle different body formats
    if isinstance(body, dict):
        status = body.get('status')
        message = body.get('message', 'No message provided')
        
        if status == 'COMPLETE':
            logger.info(f"Processing is complete: {message}")
            return True
        elif status == 'PENDING':
            logger.info(f"Processing is still pending: {message}")
            return False
        elif status == 'ERROR':
            error_msg = f"Data processing checker reported an error: {message}"
            logger.error(error_msg)
            raise Exception(error_msg)
        else:
            error_msg = f"Unexpected status '{status}' from data processing checker"
            logger.error(error_msg)
            raise Exception(error_msg)
    else:
        # For backward compatibility with string responses
        logger.warning(f"Processing status check returned a non-dict response: {body}")
        return True  # Assume complete for backward compatibility