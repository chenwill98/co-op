import boto3
import json
import os
from urllib.parse import urljoin
from sqlalchemy import text
from typing import Literal
from aws_utils import get_secret, logger, get_db_session, execute_query

def run_checks(check_type):
    # Add logic for each API type
    if check_type == "fct_properties":
        table_name = "real_estate.fct_properties"
        return check_data_freshness(table_name)
    elif check_type == "dim_property_details":
        table_name = "real_estate.dim_property_details"
        return check_data_freshness(table_name)
    elif check_type == "property_media_details":
        return check_property_media_details()
    else:
        raise ValueError(f"Unsupported check type: {check_type}")

def check_data_freshness(table_name):
    """
    Checks if the current day's data exists in the specified table by comparing
    the max date with CURRENT_DATE.
    
    Args:
        table_name (str): The fully qualified table name (schema.table)
    
    Returns:
        dict: A dictionary with status information
            - status: "COMPLETE" if today's data exists, "PENDING" if not
            - message: A descriptive message about the check result
    """
    try:
        logger.info(f"Checking if current day's data exists in {table_name}")
        
        # Get a SQLAlchemy session
        logger.info("Creating SQLAlchemy session")
        session = get_db_session()

        # Query to check if max date equals CURRENT_DATE
        query = f"""
            SELECT 
                MAX(DATE(loaded_datetime)) = CURRENT_DATE as is_current,
                MAX(DATE(loaded_datetime)) as max_date,
                CURRENT_DATE as current_date
            FROM {table_name};
        """
        
        logger.info(f"Executing query: {query}")
        result = execute_query(session, query)
        row = result.fetchone()
        is_current = row[0]
        max_date = row[1]
        current_date = row[2]
        
        logger.info(f"Max date in {table_name}: {max_date}, Current date: {current_date}")
        
        if is_current:
            return {
                "status": "COMPLETE",
                "message": f"Data for today exists in {table_name} (max date: {max_date})"
            }
        else:
            return {
                "status": "PENDING",
                "message": f"No data for today found in {table_name} (max date: {max_date}, current date: {current_date})"
            }
            
    except Exception as e:
        error_msg = f"Error checking data freshness for {table_name}: {e}"
        logger.error(error_msg)
        return {
            "status": "ERROR",
            "message": error_msg
        }
    finally:
        if 'session' in locals():
            logger.info("Closing SQLAlchemy session")
            session.close()


def lambda_handler(event, context):
    check_type = event["check_type"]
    try:
        # Fetch payloads or perform checks based on check_type
        result = run_checks(check_type)
        
        # If result is returned (from check_fct_properties_updated), return it
        if result is not None:
            return {"statusCode": 200, "body": result}
        
        # Otherwise return standard response
        return {"statusCode": 200, "body": f"Processed check type {check_type}"}
    except Exception as e:
        logger.error(f"Error processing check type {check_type}: {e}")
        raise