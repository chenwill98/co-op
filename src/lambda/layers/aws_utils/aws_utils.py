import boto3
import json
import psycopg2
# import pandas as pd
import logging

# Configure logging
logger = logging.getLogger()
if not logger.hasHandlers():  # Ensure logging is configured only once
    logger.setLevel(logging.INFO)  # Set global log level (e.g., INFO)
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# Export the logger for use in other modules
logger = logging.getLogger(__name__)

def get_secret(secret_name, region_name="us-east-2"):
    """
    Retrieve a secret from AWS Secrets Manager.
    """
    client = boto3.client("secretsmanager", region_name=region_name)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        if "SecretString" in response:
            return json.loads(response["SecretString"])
        else:
            return json.loads(response["SecretBinary"].decode("utf-8"))
    except Exception as e:
        logger.error(f"Error retrieving secret: {e}")
        raise
    
    
def generate_iam_auth_token(host, port, user, region_name="us-east-2"):
    """
    Generates the IAM Auth Token for the postgres RDS database.
    """

    try:
        session = boto3.Session()
        rds_client = session.client("rds", region_name=region_name)
        token = rds_client.generate_db_auth_token(
            DBHostname=host,
            Port=port,
            DBUsername=user
        )
        return token
    except Exception as e:
        logger.error(f"Error generating IAM auth token: {e}")
        raise
    
def generate_RDS_connection(db_name='coapt'):
    """
    Fetch connection to an RDS database.
    """
    # Fetches all top neighborhood categories for each borough to query API
    logger.info("Fetching RDS Config details from Secrets Manager")
    aws_rds_config = get_secret(secret_name='COAPTRDSConfig')
    db_host = aws_rds_config.get('db_host')
    db_user = aws_rds_config.get('db_user')
    port = 5432

    try:
        logger.info('Generating IAM Token')
        auth_token = generate_iam_auth_token(host=db_host, port=port, user=db_user)
        
        # Connect to the PostgreSQL database
        logger.info('Connecting to RDS Database')
        connection = psycopg2.connect(
            host=db_host,
            dbname=db_name,
            user=db_user,
            password=auth_token,
            port=port,
            sslmode='require'
        )

        return connection
    except Exception as e:
        logger.error(f"Error generating connection to RDS Database {db_name}: {e}")
        raise
