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
    
    
# def generate_iam_auth_token(host, port, user, region_name="us-east-2"):
#     """
#     Generates the IAM Auth Token for the postgres RDS database.
#     """

#     try:
#         session = boto3.Session()
#         rds_client = session.client("rds", region_name=region_name)
#         token = rds_client.generate_db_auth_token(
#             DBHostname=host,
#             Port=port,
#             DBUsername=user
#         )
#         return token
#     except Exception as e:
#         logger.error(f"Error generating IAM auth token: {e}")
#         raise
    

# def init_RDS_connection(db_name='coapt'):
#     """
#     Fetch connection to an RDS database using password authentication.
#     """
#     logger.info("Fetching RDS Config details from Secrets Manager")
#     aws_rds_config = get_secret(secret_name='COAPTRDSConfig')
#     db_host = aws_rds_config.get('db_host')
#     db_user = aws_rds_config.get('db_user')
#     db_password = aws_rds_config.get('db_password')  # Get password from secrets
#     port = 5432

#     try:
#         # Connect to the PostgreSQL database with password authentication
#         logger.info('Connecting to RDS Database with password authentication')
#         connection = psycopg2.connect(
#             host=db_host,
#             dbname=db_name,
#             user=db_user,
#             password=db_password,  # Use password instead of IAM token
#             port=port,
#             sslmode='require',
#             connect_timeout=10
#         )

#         return connection
#     except Exception as e:
#         logger.error(f"Error generating connection to RDS Database {db_name}: {e}")
#         raise


# def get_RDS_pool():
#     """
#     Get a connection pool to the RDS database.
#     Implements a singleton pattern to ensure only one pool is created and reused.
#     Also validates the pool to ensure connections are still valid.
#     """
#     # Singleton-like pattern, ensures one pool is created and reused
#     if not hasattr(get_RDS_pool, "_db_pool"):
#         logger.info("Creating new RDS connection pool")
#         get_RDS_pool._db_pool = init_RDS_pool()
#     else:
#         # Test if the pool is still valid by getting and returning a connection
#         try:
#             logger.debug("Testing existing connection pool")
#             conn = get_RDS_pool._db_pool.getconn()
#             # Simple query to test connection
#             with conn.cursor() as cursor:
#                 cursor.execute("SELECT 1")
#             get_RDS_pool._db_pool.putconn(conn)
#             logger.debug("Connection pool is valid")
#         except Exception as e:
#             logger.warning(f"Connection pool is invalid, recreating: {e}")
#             # Close the old pool if it exists
#             try:
#                 if hasattr(get_RDS_pool, "_db_pool"):
#                     get_RDS_pool._db_pool.closeall()
#             except:
#                 pass
#             # Create a new pool
#             get_RDS_pool._db_pool = init_RDS_pool()
    
#     return get_RDS_pool._db_pool


# def init_RDS_pool(db_name='coapt', max_retries=3, backoff_base=2):
#     """
#     Initialize the database connection pool if not already initialized.
#     Uses password authentication instead of IAM.
    
#     Args:
#         db_name: Name of the database to connect to
#         max_retries: Maximum number of retry attempts
#         backoff_base: Base for exponential backoff calculation
        
#     Returns:
#         SimpleConnectionPool: A connection pool object
#     """
#     for attempt in range(max_retries):
#         try:
#             logger.info(f"Fetching RDS Config details from Secrets Manager (attempt {attempt + 1}/{max_retries})")
#             aws_rds_config = get_secret(secret_name='COAPTRDSConfig')
#             db_host = aws_rds_config.get('db_host')
#             db_user = aws_rds_config.get('db_user')
#             db_password = aws_rds_config.get('db_password')  # Get password from secrets
#             port = 5432

#             logger.info(f"Creating connection pool with password authentication (attempt {attempt + 1}/{max_retries})")
#             db_pool = pool.SimpleConnectionPool(
#                 minconn=1,
#                 maxconn=10,
#                 host=db_host,
#                 dbname=db_name,
#                 user=db_user,
#                 password=db_password,  # Use password instead of IAM token
#                 port=port,
#                 sslmode='require',
#                 connect_timeout=10
#             )
            
#             # Test the connection with a simple query
#             connection = None
#             try:
#                 connection = db_pool.getconn()
#                 with connection.cursor() as cursor:
#                     cursor.execute("SELECT 1")
#                     result = cursor.fetchone()
#                     logger.info(f"Database connection test result: {result}")
                
#                 # Return the connection to the pool
#                 db_pool.putconn(connection)
#                 return db_pool  # Connection successful
#             except Exception as e:
#                 logger.error(f"Error testing database connection: {e}")
#                 # Close the pool and retry
#                 if connection:
#                     try:
#                         db_pool.putconn(connection)
#                     except:
#                         pass
#                 try:
#                     db_pool.closeall()
#                 except:
#                     pass
#                 raise  # Re-raise to trigger retry
        
#         except Exception as e:
#             logger.error(f"Error initializing connection pool (attempt {attempt + 1}): {e}")
            
#             # Don't sleep after the last attempt
#             if attempt < max_retries - 1:
#                 backoff_time = backoff_base ** attempt
#                 logger.info(f"Retrying in {backoff_time} seconds...")
#                 time.sleep(backoff_time)
    
#     # All attempts failed
#     logger.error(f"Failed to initialize RDS pool after {max_retries} attempts")
#     raise Exception(f"Failed to initialize RDS pool after {max_retries} attempts")


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