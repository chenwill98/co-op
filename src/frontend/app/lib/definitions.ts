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
    entered_at: string;
  }

export type PropertyDetails = {
    id: string;
    description: string;
    entered_at: string;
    floorplans: string[];
    images: string[];
    videos: string[];
  }

export type PropertyTags = {
  id: string;
  tags: string[];
};

export const tagCategories = {
  'Price': [
    'Price Drop 📉',
    'Great Deal 💰',
    'Price 📈',
    'Discounted 🔖',
    'Underpriced 🤫'
  ],
  'Features': [
    'Luxury 💎',
    'Renovated 🔨',
    'Open House 🏠',
    'Furnished 🛋️',
    'Home Office 💻',
    'Pet Friendly 🐾',
    'Spacious 🏡',
    'Cozy 🔥'
  ],
  'Location': [
    'Near Subway 🚇',
    'Park View 🌳',
    'City Center 🏙️',
    'Quiet Neighborhood 🤫',
    'Waterfront 🌊'
  ],
  'Popularity': [
    'New ✨',
    'Popular 🔥',
    'Short Term 🕒',
    'Trending 📈'
  ],
  'Amenities': [
    'Solar Powered ☀️',
    'Eco Friendly 🌿',
    'Modern Design 🆕',
    'Gym 💪',
    'Pool 🏊',
    'Rooftop Access 🚀',
    'Concierge Service 🤵'
  ],
  'Transportation': [
    'Walk Score High 🚶',
    'Close to Bus Stop 🚌',
    'Close to Train Station 🚉',
    'Bike Friendly 🚴'
  ]
};

export type CombinedPropertyDetails = Property & PropertyDetails & PropertyTags;

export type SortOrder = 'none' | 'asc' | 'desc';