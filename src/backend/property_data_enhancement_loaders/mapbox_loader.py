import json
import requests
import pandas as pd
import numpy as np
from sqlalchemy import text
from aws_utils import get_secret, logger, get_db_session, execute_query

import asyncio
import aiohttp
from tqdm.asyncio import tqdm_asyncio
from aiolimiter import AsyncLimiter

# Create rate limiter - 8 requests per second
rate_limiter = AsyncLimiter(8, 1)  # 8 requests per 1 second

# Async function to find POIs using Search Box API
async def find_pois_searchbox_async(longitude, latitude, category, radius_meters=1000, token=None):
    """
    Find POIs using Mapbox Search Box API (async version)
    
    Parameters:
    longitude, latitude: Coordinates of the center point
    category: Category of POI to search for (e.g., 'fitness_center', 'cafe')
    radius_meters: Search radius in meters (1000m is roughly a 15-minute walk)
    """
    radius_km = radius_meters / 1000
    url = f"https://api.mapbox.com/search/searchbox/v1/category/{category}"
    params = {
        'proximity': f"{longitude},{latitude}",
        'radius': radius_km,
        'limit': 25,
        'access_token': token
    }
    
    try:
        # Setup retry parameters
        retry_count = 0
        max_retries = 1  # One retry (so 2 attempts total)
        base_delay = 0.5  # Start with 0.5 second delay
        
        while True:
            try:
                # Use rate limiter to control API access
                async with rate_limiter:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(url, params=params) as response:
                            if response.status != 200:
                                error_text = await response.text()
                                
                                # Check if we should retry
                                if retry_count < max_retries and ("Too Many Requests" in error_text or response.status >= 500):
                                    retry_count += 1
                                    delay = base_delay * (2 ** retry_count)  # Exponential backoff
                                    logger.warning(f"Retrying API call for {category} after {delay:.2f}s delay (attempt {retry_count}/{max_retries})")
                                    await asyncio.sleep(delay)
                                    # Continue the while loop to retry
                                    continue
                                else:
                                    logger.error(f"Error with Search Box API for category {category}: {error_text}")
                                    return []
                            
                            data = await response.json()
                            return data.get('features', [])
                            
            except Exception as e:
                if retry_count < max_retries:
                    retry_count += 1
                    delay = base_delay * (2 ** retry_count)  # Exponential backoff
                    logger.warning(f"Exception in API call, retrying after {delay:.2f}s (attempt {retry_count}/{max_retries}): {str(e)}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Exception in API call after {retry_count} retries: {str(e)}")
                    return []
    except Exception as e:
        logger.error(f"Exception in API call: {str(e)}")
        return []

# Keep the original synchronous version for backward compatibility
def find_pois_searchbox(longitude, latitude, category, radius_meters=1000, token=None):
    """
    Find POIs using Mapbox Search Box API (synchronous version)
    
    This is kept for backward compatibility.
    """
    import requests
    
    radius_km = radius_meters / 1000
    url = f"https://api.mapbox.com/search/searchbox/v1/category/{category}"
    params = {
        'proximity': f"{longitude},{latitude}",
        'radius': radius_km,
        'limit': 25,
        'access_token': token
    }
    
    try:
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            logger.error(f"Error with Search Box API for category {category}: {response.content}")
            return []
        
        data = response.json()
        return data.get('features', [])
    except Exception as e:
        logger.error(f"Exception in API call: {str(e)}")
        return []

# Process POI features into a dataframe (unchanged)
def process_poi_features(features, listing_id):
    """
    Process POI features into a structured format for dataframe
    
    Parameters:
    features: List of POI features from Mapbox API
    listing_id: ID of the property listing this POI is associated with
    """
    poi_data = []
    for poi in features:
        if 'geometry' in poi and 'coordinates' in poi['geometry']:
            coords = poi['geometry']['coordinates']
            props = poi.get('properties', {})
            name = props.get('name', 'Unnamed')
            metadata = props.get('metadata', {})
            poi_data.append({
                'listing_id': listing_id,
                'name': name,
                'longitude': coords[0],
                'latitude': coords[1],
                'distance': props.get('distance'),
                'address': props.get('address'),
                'website': metadata.get('website')
            })
    
    return poi_data

# Async function to process a single listing
async def process_listing_async(listing, categories, radius_meters, token):
    """Process a single listing for all categories asynchronously"""
    listing_id = listing['id']
    latitude = listing['latitude']
    longitude = listing['longitude']
    
    if pd.isna(latitude) or pd.isna(longitude):
        logger.warning(f"Skipping listing {listing_id} due to missing coordinates")
        return {}
    
    logger.debug(f"Processing listing {listing_id} at {longitude}, {latitude}")
    
    # Create tasks for all categories
    tasks = []
    for category in categories:
        task = find_pois_searchbox_async(longitude, latitude, category, radius_meters, token)
        tasks.append((category, task))
    
    # Process results as they complete
    results = {}
    for category, task in tasks:
        poi_features = await task
        poi_data = process_poi_features(poi_features, listing_id)
        
        if poi_data:
            batch_df = pd.DataFrame(poi_data)
            batch_df['category'] = category
            results[category] = batch_df
    
    return results

# Async main function to process a dataframe of listings
async def process_listings_for_pois_async(listings_df, categories=None, radius_meters=1000, token=None):
    """
    Find POIs near multiple listing locations based on a dataframe (async version)
    
    Parameters:
    listings_df: DataFrame with listing_id, latitude, and longitude columns
    categories: List of categories to search for (e.g., ['cafe', 'fitness_center', 'restaurant'])
    radius_meters: Search radius in meters (default: 1000m, roughly a 15-minute walk)
    
    Returns:
    Dictionary of DataFrames: one per category and a combined 'all_pois_df'
    """
    # Default to cafe and fitness_center if no categories provided
    if categories is None or len(categories) == 0:
        categories = ['cafe', 'fitness_center']
    
    # Validate input dataframe
    required_columns = ['id', 'latitude', 'longitude']
    for col in required_columns:
        if col not in listings_df.columns:
            raise ValueError(f"Input dataframe must contain column: {col}")
    
    logger.info(f"Processing {len(listings_df)} listings for POIs in categories: {categories}")
    
    # Initialize results dictionary to store all dataframes
    results = {f"{category.replace('-', '_')}_df": pd.DataFrame() for category in categories}
    results['all_pois_df'] = pd.DataFrame()
    
    # Process all listings concurrently with progress bar
    tasks = [process_listing_async(listing, categories, radius_meters, token) 
             for _, listing in listings_df.iterrows()]
    
    all_listing_results = await tqdm_asyncio.gather(*tasks, desc="Processing listings")
    
    # Combine results from all listings
    for listing_result in all_listing_results:
        for category, batch_df in listing_result.items():
            category_key = f"{category.replace('-', '_')}_df"
            
            # Append to the category-specific dataframe
            if results[category_key].empty:
                results[category_key] = batch_df
            else:
                results[category_key] = pd.concat([results[category_key], batch_df], ignore_index=True)
            
            # Append to the combined dataframe
            if results['all_pois_df'].empty:
                results['all_pois_df'] = batch_df
            else:
                results['all_pois_df'] = pd.concat([results['all_pois_df'], batch_df], ignore_index=True)
    
    # Log results summary
    for category in categories:
        category_key = f"{category.replace('-', '_')}_df"
        logger.info(f"Found {len(results[category_key])} {category} POIs across all listings")
    
    logger.info(f"Found {len(results['all_pois_df'])} total POIs across all categories and listings")
    
    return results

# Wrapper function to maintain the same interface
def process_listings_for_pois(listings_df, categories=None, radius_meters=1000, rate_limit_delay=None, token=None):
    """
    Find POIs near multiple listing locations based on a dataframe
    
    This function now uses the async implementation internally.
    The rate_limit_delay parameter is kept for backward compatibility but is ignored.
    Rate limiting is now handled by the AsyncLimiter.
    
    Parameters:
    listings_df: DataFrame with listing_id, latitude, and longitude columns
    categories: List of categories to search for (e.g., ['cafe', 'fitness_center', 'restaurant'])
    radius_meters: Search radius in meters (default: 1000m, roughly a 15-minute walk)
    rate_limit_delay: Ignored, kept for backward compatibility
    
    Returns:
    Dictionary of DataFrames: one per category and a combined 'all_pois_df'
    """
    if rate_limit_delay is not None:
        logger.info("Note: rate_limit_delay parameter is ignored in the async implementation")
    
    # Run the async function using asyncio.run
    return asyncio.run(process_listings_for_pois_async(listings_df, categories, radius_meters, token))


def fetch_listings(session):
    query = """
    SELECT id, latitude, longitude
    FROM real_estate.latest_property_details_view
    WHERE id IS NOT NULL AND id NOT IN (
        SELECT DISTINCT listing_id
        FROM real_estate_analytics.dim_property_nearest_pois
    );"""

    listings = execute_query(session, query)
    listings_df = pd.DataFrame(listings)
    return listings_df


def load_mapbox_data(session):
    API_KEYS = get_secret(secret_name='COAPTAPIKeys')
    MAPBOX_ACCESS_TOKEN = API_KEYS['mapbox_api_key']

    listings_df = fetch_listings(session)

    if listings_df.empty:
        logger.info("No listings found to process for POIs")
        return

    listings_df = listings_df.head(1000)

    logger.info(f"Fetched {len(listings_df)} property coordinates")

    # Process the listings for POIs
    results = process_listings_for_pois(
        listings_df,
        categories=['fitness_center', 'food', 'grocery', 'park'],
        radius_meters=1000,
        token=MAPBOX_ACCESS_TOKEN
    )

    final_results = results['all_pois_df'][['listing_id', 'name', 'longitude', 'latitude', 'distance', 'address', 'website', 'category']]

    # Save the results to the database
    # Get the SQLAlchemy engine from the session
    engine = session.get_bind()

    final_results.to_sql(
        'dim_property_nearest_pois',
        con=engine,
        schema='real_estate_analytics',
        if_exists='append',
        index=False
    )   
    

def lambda_handler(event, context):

    session = get_db_session()
    
    try:
        result = load_mapbox_data(session)
        # If result is returned (from loader functions), return it
        if result is not None:
            return {"statusCode": 200, "body": result}
            
    except Exception as e:
        logger.error(f"Error processing api type mapbox: {e}")
        raise