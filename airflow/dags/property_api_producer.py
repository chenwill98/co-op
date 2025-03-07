from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.sensors.time_delta import TimeDeltaSensor
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
        FunctionName="GenericAPISQSProducer",
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
    'trigger_lambda_producer',
    default_args=default_args,
    description='Trigger APIProducerLambda based on API type',
    schedule_interval='0 7 * * *',  # Run at 7 AM EST every day
    start_date=datetime(2025, 3, 4, tzinfo=timezone('America/New_York')),
    catchup=False,
) as dag:
    # Define the first Airflow task - properties API
    trigger_properties_api = PythonOperator(
        task_id='trigger_properties_api',
        python_callable=trigger_producer_lambda,
        op_args=['properties'],
    )
    
    # Add a 5-minute pause between tasks
    wait_five_minutes = TimeDeltaSensor(
        task_id='wait_five_minutes',
        delta=timedelta(minutes=5),
    )
    
    # Define the second Airflow task - property details API
    trigger_property_details_api = PythonOperator(
        task_id='trigger_property_details_api',
        python_callable=trigger_producer_lambda,
        op_args=['property_details'],
    )
    
    # Set task dependencies - property_details should run after properties with a 5-minute pause
    trigger_properties_api >> wait_five_minutes >> trigger_property_details_api