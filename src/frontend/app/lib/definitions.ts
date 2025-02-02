export type Property = {
    id: string;
    status: string;
    listed_at: string;
    closed_at: string;
    days_on_market: number;
    available_from: string;
    address: string;
    price: number;
    borough: string;
    neighborhood: string;
    zipcode: string;
    property_type: string;
    sqft: number;
    bedrooms: number;
    bathrooms: number;
    type: string;
    latitude: number;
    longitude: number;
    amenities: string;
    built_in: string;
    building_id: string;
    agents: string;
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

export type PropertyGrades = {
  id: string;
  price_grade: Grading;
  size_grade: Grading;
  subways_grade: Grading;
  amenities_grade: Grading;
  building_grade: Grading;
  overall_grade: Grading;
}

export type PropertyTags = {
  id: string;
  tags: string[];
};

export const tagCategories = {
  Price: [
    'Price Drop 📉',
    'Great Deal 💰',
    'Price 📈',
    'Discounted 🔖',
    'Underpriced 🤫'
  ],
  Features: [
    'Luxury 💎',
    'Renovated 🔨',
    'Open House 🏠',
    'Furnished 🛋️',
    'Home Office 💻',
    'Pet Friendly 🐾',
    'Spacious 🏡',
    'Cozy 🔥'
  ],
  Location: [
    'Near Subway 🚇',
    'Park View 🌳',
    'City Center 🏙️',
    'Quiet Neighborhood 🤫',
    'Waterfront 🌊'
  ],
  Popularity: [
    'New ✨',
    'Popular 🔥',
    'Short Term 🕒',
    'Trending 📈'
  ],
  Amenities: [
    'Solar Powered ☀️',
    'Eco Friendly 🌿',
    'Modern Design 🆕',
    'Gym 💪',
    'Pool 🏊',
    'Rooftop Access 🚀',
    'Concierge Service 🤵'
  ],
  Transportation: [
    'Walk Score High 🚶',
    'Close to Bus Stop 🚌',
    'Close to Train Station 🚉',
    'Bike Friendly 🚴'
  ]
};

export type CombinedPropertyDetails = Property & PropertyDetails & PropertyGrades;

export type Grading = 'Poor' | 'Fair' | 'Good' | 'Great';

export type SortOrder = 'none' | 'asc' | 'desc';