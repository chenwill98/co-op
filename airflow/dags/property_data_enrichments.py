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

def trigger_producer_lambda(api_type, **kwargs):
    """
    Trigger the APIProducerLambda Lambda function with a given API type.
    """
    logger.info(f"Triggering PropertyDataEnrichmentLoader Lambda for type: {api_type}")
    
    try:
        response = lambda_client.invoke(
            FunctionName="PropertyDataEnrichmentLoader",
            InvocationType="Event",
            Payload=json.dumps({"api_type": api_type}),
        )
        
        response_info = {
            'StatusCode': response.get('StatusCode'),
            'RequestId': response.get('ResponseMetadata', {}).get('RequestId'),
            'HTTPStatusCode': response.get('ResponseMetadata', {}).get('HTTPStatusCode'),
            'api_type': api_type
        }
        
        logger.info(f"Successfully triggered enrichment Lambda for type: {api_type}. Status code: {response_info['StatusCode']}")
        
        # Return a serializable dictionary instead of the full response
        return response_info
    except Exception as e:
        logger.error(f"Failed to trigger enrichment Lambda for type: {api_type}. Error: {str(e)}")
        raise

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

    # Define the first Airflow task - properties API
    trigger_properties_enrichment = PythonOperator(
        task_id='trigger_properties_enrichment',
        python_callable=trigger_producer_lambda,
        op_kwargs={'api_type': 'anthropic'},
    )
    
    # This DAG is now triggered by the property_api_producer DAG
    # after property_details_api completes
    trigger_properties_enrichment
    
    logger.info("Property data enrichments DAG setup complete")