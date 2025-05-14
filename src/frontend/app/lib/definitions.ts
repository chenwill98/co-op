export type Property = {
    id: string;
    status: string;
    listed_at: string;
    closed_at: string | null;
    days_on_market: number | null;
    available_from: string | null;
    address: string;
    price: number;
    borough: string;
    neighborhood: string;
    zipcode: string;
    property_type: string | null;
    sqft: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    type: string | null;
    latitude: string;
    longitude: string;
    amenities: string[];
    built_in: number | null;
    building_id: string | null;
    agents: string[];
    no_fee: boolean;
    thumbnail_image: string;
    tag_list: string[];
    loaded_datetime: string;
    brokers_fee: number | null;
    additional_fees: JSON | null;
    url: string;
    date: string;
    fct_id: string;
    fct_price: number;
    enhanced_brokers_fee: number;
    combined_tag_list: string[];
}

export interface Neighborhood {
  id: number;
  name: string;
  level: number;
  parent_id?: number | null;
  hierarchy_path?: string | null;
}

// Slightly modified version of the Property type to incorporate max and min prices
export const propertyString = `Property = {
    status: string;
    listed_at: string;
    closed_at: string;
    available_from: string;
    address: string;
    price: number;
    borough: string;
    neighborhood: string;
    zipcode: string;
    property_type: ['condo', 'rental', 'townhouse', 'house', 'coop', 'multi-family', 'condop'];
    sqft: number;
    bedrooms: number;
    bathrooms: number;
    amenities: ['pets', 'media_room', 'hardwood_floors', 'recreation_facilities', 
    'dogs', 'storage_room', 'roofdeck', 'childrens_playroom', 'nyc_evacuation_1', 
    'fios_available', 'balcony', 'doorman', 'bike_room', 'furnished', 'hot_tub', 
    'nyc_evacuation_6', 'public_outdoor_space', 'full_time_doorman', 'locker_cage', 
    'park_view', 'nyc_evacuation_3', 'garage', 'waterview', 'part_time_doorman', 
    'tennis_court', 'leed_registered', 'garden', 'valet', 'fireplace', 'gas_fireplace', 
    'wheelchair_access', 'deck', 'waterfront', 'city_view', 'elevator', 'co_purchase', 
    'dishwasher', 'courtyard', 'washer_dryer', 'pool', 'garden_view', 'sublets', 
    'decorative_fireplace', 'parents', 'concierge', 'terrace', 'cold_storage', 
    'virtual_doorman', 'pied_a_terre', 'guarantors', 'smoke_free', 'gym', 'cats', 
    'valet_parking', 'laundry', 'nyc_evacuation_2', 'central_ac', 'private_roof_deck', 
    'roof_rights', 'patio', 'wood_fireplace', 'assigned_parking', 'parking', 'package_room', 
    'skyline_view', 'live_in_super', 'storage', 'nyc_evacuation_5'];
    built_in: number;
    agents: string[];
    no_fee: boolean;
    tag_list: string[];
    url: string;
    date: string;
    live_days_on_market: number;
  }
`

export type PropertyDetails = {
    id: string;
    description: string;
    entered_at: string;
    floorplans: string[];
    images: string[];
    videos: string[];
    tag_list?: string[];
    description_summary: string;
}

export type PropertyNearestStations = {
  listing_id: string;
  route_id: string;
  walking_minutes: number;
  route_short_name: string | null;
  route_color: string | null;
  stop_name: string | null;
  peak: number | null;
  off_peak: number | null;
  late_night: number | null;
};

export type PropertyNearestPois = {
  listing_id: string;
  name: string;
  longitude: number;
  latitude: number;
  distance: number;
  address: string | null;
  website: string | null;
  category: string;
};

// PropertyAnalyticsDetails is kept separate from station data
export type PropertyAnalyticsDetails = {
  listing_id: string;
  price_band: string;
  distinct_line_count?: number;
  amenity_score?: number;
  subway_access_percentile?: number;
  poi_access_percentile?: number;
  amenity_percentile?: number;
  sqft_percentile?: number;
  price_percentile?: number;
  subway_borough_access_percentile?: number;
  poi_borough_access_percentile?: number;
  amenity_borough_percentile?: number;
  sqft_borough_percentile?: number;
  price_borough_percentile?: number;
  subway_neighborhood_access_percentile?: number;
  poi_neighborhood_access_percentile?: number;
  amenity_neighborhood_percentile?: number;
  sqft_neighborhood_percentile?: number;
  price_neighborhood_percentile?: number;
};

export type CombinedPropertyDetails = Property & PropertyDetails & PropertyAnalyticsDetails & {
  closest_stations?: PropertyNearestStations[];
  nearest_pois?: PropertyNearestPois[];
};