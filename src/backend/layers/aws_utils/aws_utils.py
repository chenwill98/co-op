import boto3
import json
import psycopg2
from psycopg2 import pool
from aws_lambda_powertools import Logger

logger = Logger(service="coapt_lambda_functions")

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
    

def init_RDS_connection(db_name='coapt'):
    """
    Fetch connection to an RDS database.
    """
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


def get_RDS_pool():
    # Singleton-like pattern, ensures one pool is created and reused
    if not hasattr(get_RDS_pool, "_db_pool"):
        get_RDS_pool._db_pool = init_RDS_pool()
    return get_RDS_pool._db_pool


def init_RDS_pool(db_name='coapt'):
    """Initialize the database connection pool if not already initialized."""
    logger.info("Fetching RDS Config details from Secrets Manager")
    aws_rds_config = get_secret(secret_name='COAPTRDSConfig')
    db_host = aws_rds_config.get('db_host')
    db_user = aws_rds_config.get('db_user')
    port = 5432

    try:
        logger.info('Generating IAM Token')
        auth_token = generate_iam_auth_token(host=db_host, port=port, user=db_user)

        db_pool = pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,  # Adjust this based on your workload
            host=db_host,
            dbname=db_name,
            user=db_user,
            password=auth_token,
            port=port,
            sslmode='require'
        )

        return db_pool
    
    except Exception as e:
        logger.error(f"Error generating connection pool to RDS Database {db_name}: {e}")
        raise