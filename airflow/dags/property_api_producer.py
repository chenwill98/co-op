from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from pytz import timezone
import boto3
import json

# Create a boto3 Lambda client
lambda_client = boto3.client("lambda")

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
    return response

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
    schedule_interval='0 0 * * *',  # Adjust the schedule as needed
    start_date=datetime(2023, 11, 15),
    catchup=False,
    timezone=timezone('America/New_York')
) as dag:
    # Define the Airflow task
    trigger_properties_api = PythonOperator(
        task_id='trigger_properties_api',
        python_callable=trigger_producer_lambda,
        op_args=['properties'],
    )