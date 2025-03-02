import { Property } from './definitions';

// Mapping between system tags (without emojis) and display tags (with emojis)
export const tagMapping: Record<string, string> = {
  // Price category
  "price-drop": "Price Drop 📉",
  "great-deal": "Great Deal 💰",
  "price-increase": "Price 📈",
  "discounted": "Discounted 🔖",
  "underpriced": "Underpriced 🤫",
  
  // Features category
  "luxury": "Luxury 💎",
  "renovated": "Renovated 🔨",
  "open-house": "Open House 🏠",
  "furnished": "Furnished 🛋️",
  "home-office": "Home Office 💻",
  "pet-friendly": "Pet Friendly 🐾",
  "spacious": "Spacious 🏡",
  "cozy": "Cozy 🔥",
  
  // Location category
  "near-subway": "Near Subway 🚇",
  "park-view": "Park View 🌳",
  "city-center": "City Center 🏙️",
  "quiet-neighborhood": "Quiet Neighborhood 🤫",
  "waterfront": "Waterfront 🌊",
  
  // Popularity category
  "new": "New ✨",
  "popular": "Popular 🔥",
  "short-term": "Short Term 🕒",
  "trending": "Trending 📈",
  
  // Amenities category
  "solar-powered": "Solar Powered ☀️",
  "eco-friendly": "Eco Friendly 🌿",
  "modern-design": "Modern Design 🆕",
  "gym": "Gym 💪",
  "pool": "Pool 🏊",
  "rooftop-access": "Rooftop Access 🚀",
  "concierge-service": "Concierge Service 🤵",
  
  // Transportation category
  "walk-score-high": "Walk Score High 🚶",
  "close-to-bus-stop": "Close to Bus Stop 🚌",
  "close-to-train-station": "Close to Train Station 🚉",
  "bike-friendly": "Bike Friendly 🚴"
};

// Tag categories organized by type
export const tagCategories = {
  'Price': [
    'price-drop',
    'great-deal',
    'price-increase',
    'discounted',
    'underpriced'
  ],
  'Features': [
    'luxury',
    'renovated',
    'open-house',
    'furnished',
    'home-office',
    'pet-friendly',
    'spacious',
    'cozy'
  ],
  'Location': [
    'near-subway',
    'park-view',
    'city-center',
    'quiet-neighborhood',
    'waterfront'
  ],
  'Popularity': [
    'new',
    'popular',
    'short-term',
    'trending'
  ],
  'Amenities': [
    'solar-powered',
    'eco-friendly',
    'modern-design',
    'gym',
    'pool',
    'rooftop-access',
    'concierge-service'
  ],
  'Transportation': [
    'walk-score-high',
    'close-to-bus-stop',
    'close-to-train-station',
    'bike-friendly'
  ]
};

// Reverse mapping for lookups (display tag to system tag)
export const reverseTagMapping: Record<string, string> = 
  Object.entries(tagMapping).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
  }, {} as Record<string, string>);

// Helper functions to convert between system tags and display tags
export function getDisplayTag(systemTag: string): string {
  return tagMapping[systemTag] || systemTag;
}

export function getSystemTag(displayTag: string): string {
  return reverseTagMapping[displayTag] || displayTag;
}

/**
 * Converts tags between system and display formats
 * @param tags Array of tags to convert
 * @param toDisplay If true, converts from system to display format; if false, converts from display to system format
 */
export function convertTags(tags: string[], toDisplay: boolean = false): string[] {
  if (!tags || tags.length === 0) {
    return tags;
  }
  
  return tags.map(tag => toDisplay ? getDisplayTag(tag) : getSystemTag(tag));
}

/**
 * Converts property tags between formats
 * @param property The property object containing tags
 * @param toDisplay If true, converts from system to display format; if false, converts from display to system format
 */
export function convertPropertyTags(property: Property | null, toDisplay: boolean = false): Property | null {
  if (!property || !property.tag_list || property.tag_list.length === 0) {
    return property;
  }
  
  return {
    ...property,
    tag_list: convertTags(property.tag_list, toDisplay)
  };
}

/**
 * Converts tags in multiple properties
 * @param properties Array of properties
 * @param toDisplay If true, converts from system to display format; if false, converts from display to system format
 */
export function convertPropertiesTags(properties: Property[], toDisplay: boolean = false): Property[] {
  if (!properties || properties.length === 0) {
    return properties;
  }
  
  return properties.map(property => convertPropertyTags(property, toDisplay) as Property);
}