import json
import requests
import pandas as pd
import numpy as np
from sqlalchemy import text
from aws_utils import get_secret, logger, get_db_session, execute_query

# Create a simplified parent station dataframe with just the 3 columns
def create_simple_parent_station_df(subway_df):
    """
    Create a simplified dataframe with just parent_station, stop_lat, and stop_lon
    
    Parameters:
    -----------
    subway_df : Original subway dataframe
    
    Returns:
    --------
    DataFrame with only parent_station, stop_lat, stop_lon columns
    """
    # Handle missing parent_station values
    # If parent_station is NaN, use stop_id as the parent_station
    subway_df_copy = subway_df.copy()
    subway_df_copy['parent_station'] = subway_df_copy['parent_station'].fillna(subway_df_copy['stop_id'])
    
    # Group by parent_station and keep only the coordinates
    parent_stations = subway_df_copy.groupby('parent_station').agg({
        'stop_lat': 'mean',  # Average latitude for the station
        'stop_lon': 'mean',  # Average longitude for the station
    }).reset_index()
    
    return parent_stations

# Simplified function that returns only listing_id, parent_station, and distance metrics
def find_nearby_subway_stations_manhattan(listings_df, parent_station_df, max_walking_minutes=15):
    """
    Find parent stations within Manhattan walking distance of each listing
    
    Parameters:
    -----------
    listings_df : DataFrame with columns (id, latitude, longitude)
    parent_station_df : DataFrame with ONLY parent_station, stop_lat, stop_lon
    max_walking_minutes : Maximum walking time in minutes (default: 15)
    
    Returns:
    --------
    DataFrame with listing_id, parent_station, distance and time
    """
    # Walking speed in km/h
    walking_speed_kmh = 4.5
    
    # Constants for conversion
    km_per_lat = 111.0
    
    # Results container
    results = []
    
    # Process each property listing
    for _, listing in listings_df.iterrows():
        try:
            listing_id = listing['id']
            listing_lat = float(listing['latitude'])
            listing_lon = float(listing['longitude'])
        except (ValueError, TypeError):
            continue
        
        # Calculate the longitude distance factor at this latitude
        km_per_lon = km_per_lat * np.cos(np.radians(listing_lat))
        
        # Process each station
        for _, station in parent_station_df.iterrows():
            try:
                station_lat = float(station['stop_lat'])
                station_lon = float(station['stop_lon'])
            except (ValueError, TypeError):
                continue
                
            # Calculate Manhattan distance components
            lat_distance = abs(listing_lat - station_lat) * km_per_lat
            lon_distance = abs(listing_lon - station_lon) * km_per_lon
            
            # Manhattan distance = sum of north-south and east-west distances
            manhattan_distance_km = lat_distance + lon_distance
            
            # Calculate walking time in minutes
            walking_minutes = (manhattan_distance_km / walking_speed_kmh) * 60
            
            # Check if within walking threshold
            if walking_minutes <= max_walking_minutes:
                # Create result row with ONLY the necessary fields
                result_row = {
                    'listing_id': listing_id,
                    'parent_station': station['parent_station'],
                    'manhattan_distance_km': round(manhattan_distance_km, 2),
                    'walking_minutes': round(walking_minutes, 1)
                }
                
                results.append(result_row)
    
    # Convert to DataFrame
    results_df = pd.DataFrame(results)
    
    # If no results, return empty DataFrame with columns
    if len(results_df) == 0:
        return pd.DataFrame(columns=['listing_id', 'parent_station', 'manhattan_distance_km', 'walking_minutes'])
    
    # Sort by listing_id and walking_minutes
    results_df = results_df.sort_values(['listing_id', 'walking_minutes'])
    
    return results_df

def aggregate_by_listing_and_route(nearby_df):
    """
    Aggregate nearby stations dataframe by listing_id, parent_station, and route_id.
    Takes average of travel times and keeps other columns.
    
    Parameters:
    -----------
    nearby_df : DataFrame with nearby subway stations
    
    Returns:
    --------
    DataFrame aggregated by listing_id, parent_station, and route_id
    """
    # Define aggregation functions for each column
    agg_funcs = {
        'manhattan_distance_km': 'first',
        'walking_minutes': 'first',
        'route_short_name': 'first',
        'route_long_name': 'first',
        'route_color': 'first',
        'stop_name': 'first',
        'peak': 'mean',
        'off_peak': 'mean',
        'late_night': 'mean',
        'stop_lat': 'first',
        'stop_lon': 'first',
        'location_type': 'first',
        'agency_id': 'first'
    }
    
    # Group by listing_id, parent_station, and route_id and aggregate
    aggregated_df = nearby_df.groupby(['listing_id', 'parent_station', 'route_id']).agg(agg_funcs).reset_index()
    
    # Round the averaged travel times
    if 'peak' in aggregated_df.columns:
        aggregated_df['peak'] = aggregated_df['peak'].round(2)
    if 'off_peak' in aggregated_df.columns:
        aggregated_df['off_peak'] = aggregated_df['off_peak'].round(2)
    if 'late_night' in aggregated_df.columns:
        aggregated_df['late_night'] = aggregated_df['late_night'].round(2)
    
    return aggregated_df

def get_nearest_station_per_route(aggregated_df):
    """
    Filter the aggregated dataframe to keep only the closest station for each route_id for each listing_id
    
    Parameters:
    -----------
    aggregated_df : DataFrame with aggregated subway station data
    
    Returns:
    --------
    DataFrame with only the closest station for each route for each listing
    """
    # Sort the dataframe by listing_id, route_id, and walking_minutes
    sorted_df = aggregated_df.sort_values(['listing_id', 'route_id', 'walking_minutes'])
    
    # Keep only the first occurrence (shortest walking time) for each listing_id and route_id
    nearest_df = sorted_df.drop_duplicates(subset=['listing_id', 'route_id'], keep='first')
    
    # Sort the results by listing_id and walking_minutes
    nearest_df = nearest_df.sort_values(['listing_id', 'walking_minutes'])
    
    return nearest_df

def load_nearest_subways(session):
    try:
        logger.info("Fetching property coordinates")
        query = """
        SELECT id, latitude, longitude
        FROM real_estate.latest_property_details_view
        WHERE id IS NOT NULL
          AND id NOT IN (
              SELECT listing_id
              FROM real_estate_analytics.dim_property_nearest_stations
          );"""

        listings = execute_query(session, query)
        listings_df = pd.DataFrame(listings)
        logger.info(f"Fetched {len(listings_df)} property coordinates")
        
        logger.info("Fetching subway stations")
        query = """
        SELECT * FROM real_estate_analytics.subway_stops;
        """

        subways = execute_query(session, query)
        subway_df = pd.DataFrame(subways)
        logger.info(f"Fetched {len(subway_df)} subway stations")

        logger.info("Creating simple parent station dataframe")
        simple_parent_df = create_simple_parent_station_df(subway_df)

        logger.info("Finding nearby stations")
        nearby_stations_df = find_nearby_subway_stations_manhattan(listings_df, simple_parent_df)

        logger.info("Joining nearby stations with subway data")
        nearby_stations_with_subway_df = nearby_stations_df.merge(subway_df, on='parent_station', how='left')

        logger.info("Aggregating nearby stations")
        aggregated_stations_df = aggregate_by_listing_and_route(nearby_stations_with_subway_df)

        logger.info("Getting nearest station per route")
        nearest_stations_df = get_nearest_station_per_route(aggregated_stations_df)

        logger.info(f"Inserting {len(nearest_stations_df)} nearest stations into dim_property_nearest_stations")
        engine = session.get_bind()
        nearest_stations_df.to_sql(
            'dim_property_nearest_stations',
            con=engine,
            schema='real_estate_analytics',
            if_exists='append',
            index=False
        )

    except Exception as e:
        logger.error(f"Error fetching property coordinates: {e}")
        raise
    finally:
        if 'session' in locals():
            session.close()

def load_mapbox_data(session):
    pass

def load_analytics_tags(session):
    # OBVIOUSLY NEED TO CHANGE - ALSO I SHOULD ADD THE LOCATIONS TAGS TO EACH NEIGHBORHOOD
    try:
        logger.info("Fetching property coordinates")
        query = """
        SELECT id, latitude, longitude
        FROM real_estate.latest_property_details_view
        WHERE id IS NOT NULL
          AND id NOT IN (
              SELECT listing_id
              FROM real_estate_analytics.dim_property_nearest_stations
          );"""

        listings = execute_query(session, query)
        listings_df = pd.DataFrame(listings)
        logger.info(f"Fetched {len(listings_df)} property coordinates")

        logger.info(f"Inserting {len(listings_df)} nearest stations into dim_property_nearest_stations")
        engine = session.get_bind()
        listings_df.to_sql(
            'dim_property_nearest_stations',
            con=engine,
            schema='real_estate_analytics',
            if_exists='append',
            index=False
        )

    except Exception as e:
        logger.error(f"Error fetching property coordinates: {e}")
        raise
    finally:
        if 'session' in locals():
            session.close()

def run_enhancement_loaders(load_type):
    API_KEYS = get_secret(secret_name='COAPTAPIKeys')
    logger.info(f"Fetching API payloads for {load_type}")
    session = get_db_session()
    
    if load_type == "subway":
        load_nearest_subways(session)
    elif load_type == "mapbox":
        load_mapbox_data(session)
    elif load_type == "analytics_tags":
        load_analytics_tags(session)
    else:
        raise ValueError(f"Unsupported API type: {load_type}")

def lambda_handler(event, context):
    load_type = event["load_type"]
    
    try:
        result = run_enhancement_loaders(load_type)
        # If result is returned (from loader functions), return it
        if result is not None:
            return {"statusCode": 200, "body": result}
            
    except Exception as e:
        logger.error(f"Error processing api type {load_type}: {e}")
        raise

# def upsert_properties_to_rds(session, listings):
#     """
#     Upsert a batch of listings into the real_estate.fct_properties table.
#     """
#     # Delete query (commented out in original)
#     # delete_query = """
#     #     DELETE FROM real_estate.fct_properties
#     #     WHERE "date" = CURRENT_DATE;
#     # """

#     upsert_query = """
#         INSERT INTO real_estate.fct_properties (id, price, longitude, latitude, url, "date")
#         VALUES (:id, :price, :longitude, :latitude, :url, CURRENT_DATE)
#         ON CONFLICT (id, "date") DO UPDATE SET
#             price = EXCLUDED.price,
#             longitude = EXCLUDED.longitude,
#             latitude = EXCLUDED.latitude,
#             url = EXCLUDED.url;
#     """

#     try:
#         # Uncomment if needed
#         # execute_query(session, delete_query)
#         # session.commit()
        
#         logger.info(f"Inserting {len(listings)} into real_estate.fct_properties Table")
        
#         for listing in listings:
#             data_dict = {
#                 'id': listing["id"],
#                 'price': listing["price"],
#                 'longitude': listing["longitude"],
#                 'latitude': listing["latitude"],
#                 'url': listing["url"],
#             }
            
#             # Use the execute_query helper function
#             execute_query(session, upsert_query, data_dict)
        
#         session.commit()
#         logger.info(f"Successfully upserted {len(listings)} listings to fct_properties")
#     except Exception as e:
#         session.rollback()
#         logger.error(f"Error upserting to fct_properties: {e}")
#         raise

# def fetch_and_store_data(message_list):
#     """
#     Fetch data from the given API URL, handle pagination, and store results in RDS.
#     """
#     properties_list = []
#     for i, message in enumerate(message_list):
#         logger.info(f"Processing message {i+1} of {len(message_list)}")
#         try:
#             offset = 0
#             while True:
#                 params = message['params']
#                 params['offset'] = offset

#                 logger.info(f"Making call with {params['areas']}")
#                 response = requests.get(message['endpoint'], headers=message['headers'], params=params)
#                 response.raise_for_status()
#                 data = response.json()

#                 listings = data.get("listings", [])
#                 logger.info(f"Fetched {len(listings)} listings")
#                 if listings:
#                     properties_list.extend(listings)
                    

#                 pagination = data.get("pagination", {})
#                 next_offset = pagination.get("nextOffset")

#                 # If there's no nextOffset or no new offset to move to, break the loop
#                 if not next_offset or next_offset <= offset:
#                     break
#                 logger.info(f"Setting offset to {next_offset}")
#                 offset = next_offset

#         except Exception as e:
#             logger.info(f"Error processing {message}: {e}")
#             raise

#     try:
#         # Get a SQLAlchemy session
#         logger.info("Creating SQLAlchemy session")
#         session = get_db_session()

#         logger.info(f"Inserting {len(properties_list)} into real_estate.fct_properties Table")
#         upsert_properties_to_rds(session, properties_list)

#     except Exception as e:
#         logger.info(f"Error upserting properties: {e}")
#         raise
    
#     finally:
#         if 'session' in locals():
#             logger.info("Closing SQLAlchemy session")
#             session.close()