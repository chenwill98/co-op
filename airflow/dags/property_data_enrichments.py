from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.log.logging_mixin import LoggingMixin
from airflow.sensors.python import PythonSensor
from airflow.plugins.utils.lambda_helpers import check_processing_status
from datetime import datetime, timedelta
from pytz import timezone
import boto3
import json

# Initialize Airflow's logger
logger = LoggingMixin().log

# Create a boto3 Lambda client with region specified
lambda_client = boto3.client("lambda", region_name="us-east-2")

def create_batch(**kwargs):
    """
    Create an Anthropic batch and return the batch ID.
    
    This function invokes the dedicated AnthropicBatchProcessor Lambda to create a new
    batch processing job for property descriptions using Anthropic's API.
    
    Returns:
        str: The batch ID for the created batch processing job
        
    Raises:
        ValueError: If the batch_id is missing from the response
        Exception: For any other errors during batch creation
    """
    logger.info("Creating Anthropic batch for property descriptions")
    
    try:
        # Use RequestResponse to get immediate results with batch ID
        response = lambda_client.invoke(
            FunctionName="AnthropicBatchProcessor",
            InvocationType="RequestResponse",
            Payload=json.dumps({"action": "create_batch"}),
        )
        
        # Parse the response to get batch_id
        response_payload = json.loads(response['Payload'].read().decode())
        
        if response_payload.get('statusCode') == 200 and 'body' in response_payload:
            body = response_payload['body']
            batch_id = body.get('batch_id')
            if batch_id:
                logger.info(f"Successfully created batch with ID: {batch_id}")
                return batch_id
        
        # Error handling if batch_id is missing
        error_msg = f"Failed to get batch_id from response: {response_payload}"
        logger.error(error_msg)
        raise ValueError(error_msg)
        
    except Exception as e:
        logger.error(f"Error creating Anthropic batch: {e}")
        raise

def check_batch_complete(batch_id, **kwargs):
    """
    Check if an Anthropic batch processing job is complete.
    
    This function invokes the AnthropicBatchProcessor Lambda to check the status
    of a previously created batch processing job. It's designed to be used with
    Airflow's PythonSensor to poll for completion.
    
    Args:
        batch_id (str): The ID of the batch to check
        **kwargs: Additional keyword arguments passed by Airflow
        
    Returns:
        bool: True when the batch is complete, False when still processing or on error
    """
    if not batch_id:
        logger.error("No batch_id provided for status check")
        return False
        
    logger.info(f"Checking batch status for: {batch_id}")
    
    try:
        response = lambda_client.invoke(
            FunctionName="AnthropicBatchProcessor",
            InvocationType="RequestResponse",
            Payload=json.dumps({
                "action": "check_status",
                "batch_id": batch_id
            }),
        )
        
        response_payload = json.loads(response['Payload'].read().decode())
        
        if response_payload.get('statusCode') == 200 and 'body' in response_payload:
            body = response_payload['body']
            is_complete = body.get('is_complete', False)
            
            # Log useful status information
            if 'completed_requests' in body and 'total_requests' in body:
                completed = body['completed_requests']
                total = body['total_requests']
                progress = (completed / total) * 100 if total > 0 else 0
                logger.info(f"Batch progress: {progress:.1f}% ({completed}/{total})")
            
            return is_complete
            
        logger.warning(f"Unexpected response format: {response_payload}")
        return False
        
    except Exception as e:
        logger.error(f"Error checking batch status: {e}")
        return False

# Default DAG arguments
default_args = {
    'owner': 'chenwill98',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

# Define the DAG
with DAG(
    'property_data_enrichments',
    default_args=default_args,
    description='Trigger property data enrichment Lambda functions',
    schedule_interval=None,  # Set to None so it's only triggered by other DAGs
    start_date=datetime(2025, 3, 4, tzinfo=timezone('America/New_York')),
    catchup=False,
) as dag:
    logger.info("Initializing property_data_enrichments DAG")

    # Check processing status every 5 minutes until complete
    wait_for_processing = PythonSensor(
        task_id='wait_for_processing',
        python_callable=check_processing_status,
        op_kwargs={'check_type': 'dim_property_details'},
        poke_interval=300,  # 5 minutes in seconds
        timeout=43200,  # 12 hours max wait time
        mode='poke',
        soft_fail=False,
    )

    # Step 1: Create Anthropic batch and get batch ID
    create_anthropic_batch = PythonOperator(
        task_id='create_anthropic_batch',
        python_callable=create_batch,
        do_xcom_push=True,  # Push batch_id to XCom
    )
    
    # Step 2: Wait for Anthropic batch processing to complete
    wait_for_anthropic_batch = PythonSensor(
        task_id='wait_for_anthropic_batch',
        python_callable=check_batch_complete,
        op_kwargs={
            # Simply pull the batch_id directly from the previous task
            'batch_id': "{{ task_instance.xcom_pull(task_ids='create_anthropic_batch') }}"
        },
        poke_interval=600,  # Check every 10 minutes
        timeout=7200,  # 2 hours max wait time
        mode='poke',
        soft_fail=False,
    )
    
    # Define the task dependencies
    wait_for_processing >> create_anthropic_batch >> wait_for_anthropic_batch
    
    logger.info("Property data enrichments DAG setup complete")