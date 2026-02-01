import boto3
import json
import psycopg2
import time
from psycopg2 import pool
from aws_lambda_powertools import Logger
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session

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


# SQLAlchemy connection handling
def get_sqlalchemy_engine(db_name='coapt', max_retries=3, backoff_base=2):
    """
    Get a SQLAlchemy engine for the RDS database.
    Implements a singleton pattern to ensure only one engine is created and reused.
    
    Args:
        db_name: Name of the database to connect to
        max_retries: Maximum number of retry attempts
        backoff_base: Base for exponential backoff calculation
        
    Returns:
        Engine: A SQLAlchemy engine object
    """
    # Singleton-like pattern, ensures one engine is created and reused
    if not hasattr(get_sqlalchemy_engine, "_engine"):
        logger.info("Creating new SQLAlchemy engine")
        get_sqlalchemy_engine._engine = init_sqlalchemy_engine(db_name, max_retries, backoff_base)
    else:
        # Test if the engine is still valid with a simple query
        try:
            logger.debug("Testing existing SQLAlchemy engine")
            connection = get_sqlalchemy_engine._engine.connect()
            connection.execute(text("SELECT 1"))
            connection.close()
            logger.debug("SQLAlchemy engine is valid")
        except Exception as e:
            logger.warning(f"SQLAlchemy engine is invalid, recreating: {e}")
            # Create a new engine
            get_sqlalchemy_engine._engine = init_sqlalchemy_engine(db_name, max_retries, backoff_base)
    
    return get_sqlalchemy_engine._engine


def init_sqlalchemy_engine(db_name='coapt', max_retries=3, backoff_base=2):
    """
    Initialize a SQLAlchemy engine for the RDS database using password authentication.
    
    Args:
        db_name: Name of the database to connect to
        max_retries: Maximum number of retry attempts
        backoff_base: Base for exponential backoff calculation
        
    Returns:
        Engine: A SQLAlchemy engine object
    """
    for attempt in range(max_retries):
        try:
            logger.info(f"Fetching RDS Config details from Secrets Manager (attempt {attempt + 1}/{max_retries})")
            aws_rds_config = get_secret(secret_name='COAPTRDSConfig')
            db_host = aws_rds_config.get('db_host')
            db_user = aws_rds_config.get('db_user')
            db_password = aws_rds_config.get('db_password')  # Get password from secrets
            port = 5432

            logger.info(f"Creating SQLAlchemy engine with password authentication (attempt {attempt + 1}/{max_retries})")
            # Format connection string with password instead of token
            connection_string = f"postgresql://{db_user}:{db_password}@{db_host}:{port}/{db_name}"
            engine = create_engine(
                connection_string,
                connect_args={
                    'sslmode': 'require',
                    'connect_timeout': 5  # Reduced timeout for faster failure
                },
                pool_pre_ping=True,  # Verify connections before use
                pool_size=5,
                max_overflow=5,
                pool_recycle=300  # Recycle connections after 5 minutes
            )
            
            # Test the connection with a simple query
            try:
                connection = engine.connect()
                connection.execute(text("SELECT 1"))
                connection.close()
                logger.info("SQLAlchemy engine test successful")
                return engine  # Connection successful
            except Exception as e:
                logger.error(f"Error testing SQLAlchemy engine: {e}")
                # Close the engine and retry
                engine.dispose()
                raise  # Re-raise to trigger retry
        
        except Exception as e:
            logger.error(f"Error initializing SQLAlchemy engine (attempt {attempt + 1}): {e}")
            
            # Don't sleep after the last attempt
            if attempt < max_retries - 1:
                backoff_time = backoff_base ** attempt
                logger.info(f"Retrying in {backoff_time} seconds...")
                time.sleep(backoff_time)
    
    # All attempts failed
    logger.error(f"Failed to initialize SQLAlchemy engine after {max_retries} attempts")
    raise Exception(f"Failed to initialize SQLAlchemy engine after {max_retries} attempts")


def get_db_session(db_name='coapt'):
    """
    Get a SQLAlchemy session for the RDS database.
    
    Returns:
        Session: A SQLAlchemy session object
    """
    engine = get_sqlalchemy_engine(db_name)
    session_factory = sessionmaker(bind=engine)
    Session = scoped_session(session_factory)
    return Session()


def execute_query(session, query, params=None):
    """
    Execute a query using the provided session.
    
    Args:
        session: A SQLAlchemy session object
        query: A SQL query as a string
        params: Optional parameters for the query
        
    Returns:
        Result: The result of the query execution
    """
    try:
        if params:
            result = session.execute(text(query), params)
        else:
            result = session.execute(text(query))
        return result
    except Exception as e:
        logger.error(f"Error executing query: {e}")
        raise