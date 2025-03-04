from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from pytz import timezone
import boto3
import json

# Create a boto3 Lambda client with region specified
lambda_client = boto3.client("lambda", region_name="us-east-2")

def trigger_producer_lambda(api_type, **kwargs):
    """
    Trigger the APIProducerLambda Lambda function with a given API type.
    """
    response = lambda_client.invoke(
        FunctionName="PropertyDataEnrichmentLoader",
        InvocationType="Event",
        Payload=json.dumps({"api_type": api_type}),
    )
    print(f"Triggered Lambda for API type {api_type}. Response: {response}")
    
    # Return a serializable dictionary instead of the full response
    return {
        'StatusCode': response.get('StatusCode'),
        'RequestId': response.get('ResponseMetadata', {}).get('RequestId'),
        'HTTPStatusCode': response.get('ResponseMetadata', {}).get('HTTPStatusCode'),
        'api_type': api_type
    }

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
    schedule_interval='0 8 * * *',  # Run at 8 AM EST every day
    start_date=datetime(2025, 3, 4, tzinfo=timezone('America/New_York')),
    catchup=False,
) as dag:
    # Define the first Airflow task - properties API
    trigger_properties_enrichment = PythonOperator(
        task_id='trigger_properties_enrichment',
        python_callable=trigger_producer_lambda,
        op_args=['lambda_enrichments'],
    )
    
    # Set task dependencies - property_details should run after properties
    trigger_properties_enrichment