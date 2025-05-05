from airflow.operators.python import PythonOperator
from airflow import DAG
from airflow.sensors.python import PythonSensor
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from airflow.utils.log.logging_mixin import LoggingMixin
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
    logger.info(f"Triggering Lambda for API type: {api_type}")
    
    try:
        response = lambda_client.invoke(
            FunctionName="GenericAPISQSProducer",
            InvocationType="Event",
            Payload=json.dumps({"api_type": api_type}),
        )
        
        response_info = {
            'StatusCode': response.get('StatusCode'),
            'RequestId': response.get('ResponseMetadata', {}).get('RequestId'),
            'HTTPStatusCode': response.get('ResponseMetadata', {}).get('HTTPStatusCode'),
            'api_type': api_type
        }
        
        logger.info(f"Successfully triggered Lambda for API type: {api_type}. Status code: {response_info['StatusCode']}")
        
        # Return a serializable dictionary instead of the full response
        return response_info
    except Exception as e:
        logger.error(f"Failed to trigger Lambda for API type: {api_type}. Error: {str(e)}")
        raise

# Function to check SQL threshold
def check_properties_threshold(**kwargs):
    """
    Check if the properties table has data for the current day by querying the count.
    Returns True when the threshold condition is met.
    """
    hook = PostgresHook(postgres_conn_id='rds_postgres')
    record = hook.get_first(
        """
        SELECT COUNT(*) 
        FROM real_estate.fct_properties
        WHERE DATE(loaded_datetime) = CURRENT_DATE
        """
    )
    return record is not None and record[0] > 1000

# Function to check SQL threshold
def check_property_details_threshold(**kwargs):
    """
    Check if the property_details table has data for the current day by querying the count.
    Returns True when the threshold condition is met.
    """
    hook = PostgresHook(postgres_conn_id='rds_postgres')
    record = hook.get_first(
        """
        SELECT COUNT(*) 
        FROM real_estate.latest_property_details_view
        WHERE DATE(loaded_datetime) = CURRENT_DATE
        AND id IS NOT NULL
        """
    )
    return record is not None and record[0] < 100

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
    schedule='0 7 * * *',  # Run at 7 AM EST every day
    start_date=datetime(2025, 3, 4, tzinfo=timezone('America/New_York')),
    catchup=False,
) as dag:
    logger.info("Initializing trigger_lambda_producer DAG")
    # Define the first Airflow task - properties API
    trigger_properties_api = PythonOperator(
        task_id='trigger_properties_api',
        python_callable=trigger_producer_lambda,
        op_kwargs={'api_type': 'properties'},
    )
    
    # Sensor to check when properties table meets threshold
    wait_for_properties = PythonSensor(
        task_id='wait_for_properties',
        python_callable=check_properties_threshold,
        mode='poke',
        poke_interval=60,
        timeout=30 * 60,
    )
    
    # Define the second Airflow task - property details API
    trigger_property_details_api = PythonOperator(
        task_id='trigger_property_details_api',
        python_callable=trigger_producer_lambda,
        op_kwargs={'api_type': 'property_details'},
    )
    
    # Sensor to check when property_details table meets threshold
    wait_for_property_details = PythonSensor(
        task_id='wait_for_property_details',
        python_callable=check_property_details_threshold,
        mode='poke',
        poke_interval=60,
        timeout=30 * 60,
    )    
    # Trigger the property_data_enrichments DAG after property_details_api completes
    trigger_enrichments_dag = TriggerDagRunOperator(
        task_id='trigger_enrichments_dag',
        trigger_dag_id='property_data_enrichments',
        wait_for_completion=False,
        reset_dag_run=True,
        poke_interval=60,
    )
    
    # Set task dependencies - property_details should run after properties are fully processed
    # and then trigger the enrichments DAG
    trigger_properties_api >> wait_for_properties >> trigger_property_details_api >> wait_for_property_details >> trigger_enrichments_dag
    
    logger.info("DAG task dependencies set up successfully")