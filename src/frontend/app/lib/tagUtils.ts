import { Property } from './definitions';

// What's Well-Covered
// Price qualifiers: The range from great deals to overpriced covers value assessment well
// Space characteristics: Good coverage of size gradients and quality attributes
// Location attributes: Strong coverage of neighborhood characteristics and proximity
// Transportation options: Comprehensive coverage of transit accessibility and parking
// Amenities: Solid coverage of common building amenities
// Areas for Potential Enhancement
// Safety & Security
// Tags like "safe-neighborhood", "security-system", "doorman-building", "gated-community"
// Safety is often a top priority for many renters/buyers
// Noise & Privacy
// More specific noise tags like "street-facing", "courtyard-facing", "top-floor"
// Privacy indicators like "corner-unit", "end-unit"
// Specific Property Features
// Kitchen-specific tags: "chef's-kitchen", "updated-appliances", "outdated-kitchen"
// Bathroom-specific tags: "multiple-bathrooms", "updated-bathroom"
// Unique features: "fireplace", "exposed-brick", "hardwood-floors", "carpet"
// Building Age & Construction
// "new-construction", "pre-war", "historic-building"
// "well-maintained", "needs-repair"
// Accessibility Features
// "wheelchair-accessible", "elevator-building", "ground-floor"
// "step-free-entry", "accessible-bathroom"
// Lifestyle & Community
// "family-friendly", "student-area", "professional-neighborhood"
// "good-school-district", "nightlife-nearby", "cultural-area"
// Temporary & Seasonal Tags
// "price-negotiable", "motivated-seller", "fast-closing-possible"
// "central-ac", "heat-included", "winter-ready"
// View & Orientation
// More specific than just "park-view": "skyline-view", "water-view", "garden-view"
// "south-facing", "north-facing" (important for natural light)

// Tag type interface
interface Tag {
  name: string;
  display: string;
  source: string[];
}

// Tag categories organized by type
export const tagCategories = {
  'Price': [
    {name: 'great-deal', display: 'Great Deal 💰', source: ['Analysis'], rank: 1},
    {name: 'good-deal', display: 'Good Deal 👍', source: ['Analysis'], rank: 1},
    {name: 'fair-deal', display: 'Fair Deal 👌', source: ['Analysis'], rank: 1},
    {name: 'poor-deal', display: 'Poor Deal 👎', source: ['Analysis'], rank: 1},
    {name: 'price-drop', display: 'Price Drop 📉', source: ['Analysis'], rank: 1},
    {name: 'price-increase', display: 'Price Increase 📈', source: ['Analysis'], rank: 1},
    {name: 'poor-price', display: 'Overpriced 💸', source: ['Analysis'], rank: 1},
    {name: 'fair-price', display: 'Average Price 🆗', source: ['Analysis'], rank: 1},
    {name: 'good-price', display: 'Good Price 👍', source: ['Analysis'], rank: 1},
    {name: 'great-price', display: 'Great Price 🤑', source: ['Analysis'], rank: 1},
  ],
  'Features': [
    {name: 'spacious', display: 'Spacious 🏡', source: ['AI', 'Analysis'], rank: 2},
    {name: 'average-size', display: 'Average Size ⬜', source: ['Analysis'], rank: 2},
    {name: 'cramped', display: 'Cramped 😬', source: ['Analysis'], rank: 2},
    {name: 'luxury', display: 'Luxury 💎', source: ['AI'], rank: 3},
    {name: 'renovated', display: 'Renovated 🔨', source: ['AI'], rank: 3},
    {name: 'open-house', display: 'Open House 🏠', source: ['AI'], rank: 3},
    {name: 'furnished', display: 'Furnished 🛋️', source: ['AI'], rank: 3},
    {name: 'home-office', display: 'Home Office 💻', source: ['AI'], rank: 3},
    {name: 'pre-war', display: 'Pre-War 💥', source: ['AI', 'Analysis'], rank: 3},
    {name: 'brownstone', display: 'Brownstone 🏢', source: ['AI'], rank: 3},
    {name: 'cozy', display: 'Cozy 🔥', source: ['AI'], rank: 3},
    {name: 'high-ceilings', display: 'High Ceilings 🔝', source: ['AI'], rank: 3},
    {name: 'natural-light', display: 'Natural Light ☀️', source: ['AI'], rank: 3}
  ],
  'Location': [
    {name: 'great-location', display: 'Great Location 🌟', source: ['Analysis'], rank: 1},
    {name: 'good-location', display: 'Good Location 👍', source: ['Analysis'], rank: 1},
    {name: 'fair-location', display: 'Fair Location 👌', source: ['Analysis'], rank: 1},
    {name: 'poor-location', display: 'Poor Location 👎', source: ['Analysis'], rank: 1},
    {name: 'park-view', display: 'Park View 🌳', source: ['AI'], rank: 2},
    // {name: 'city-center', display: 'City Center 🏙️', source: ['AI', 'Analysis'], rank: 2},
    // {name: 'prime-location', display: 'Prime Location 🌟', source: ['AI', 'Analysis'], rank: 2},
    {name: 'up-and-coming', display: 'Up and Coming 📈', source: ['AI', 'Analysis'], rank: 3},
    {name: 'quiet-neighborhood', display: 'Quiet Neighborhood 🤫', source: ['AI', 'Analysis'], rank: 3},
    {name: 'noisy-area', display: 'Noisy Area 🔊', source: ['AI', 'Analysis'], rank: 3},
    {name: 'waterfront', display: 'Waterfront 🌊', source: ['AI', 'Analysis'], rank: 3},
    {name: 'restaurants-nearby', display: 'Restaurants Nearby 🍽️', source: ['AI', 'Analysis'], rank: 3},
    {name: 'gyms-nearby', display: 'Gyms Nearby 🏋️', source: ['AI', 'Analysis'], rank: 3},
    {name: 'groceries-nearby', display: 'Groceries Nearby 🛒', source: ['AI', 'Analysis'], rank: 3},
    {name: 'parks-nearby', display: 'Parks Nearby 🌲', source: ['AI', 'Analysis'], rank: 3}
  ],
  'Popularity': [
    {name: 'new', display: 'New ✨', source: ['Analysis'], rank: 1},
    {name: 'popular', display: 'Popular 🔥', source: ['Analysis'], rank: 1},
    {name: 'in-demand', display: 'In Demand 🚀', source: ['Analysis'], rank: 1},
    {name: 'short-term', display: 'Short Term 🕒', source: ['Analysis'], rank: 1},
    {name: 'trending', display: 'Trending 📈', source: ['Analysis'], rank: 1},
    {name: 'long-time-listed', display: 'Listed Long 📆', source: ['Analysis'], rank: 1}
  ],
  'Amenities': [
    {name: 'great-amenities', display: 'Great Amenities 🌟', source: ['Analysis'], rank: 2},
    {name: 'good-amenities', display: 'Good Amenities 👍', source: ['Analysis'], rank: 1},
    {name: 'fair-amenities', display: 'Fair Amenities 👌', source: ['Analysis'], rank: 1},
    {name: 'poor-amenities', display: 'Poor Amenities 👎', source: ['Analysis'], rank: 1},
    {name: 'pet-friendly', display: 'Pet Friendly 🐾', source: ['AI', 'Analysis'], rank: 3},
    {name: 'solar-powered', display: 'Solar Powered ☀️', source: ['AI'], rank: 3},
    {name: 'eco-friendly', display: 'Eco Friendly 🌿', source: ['AI'], rank: 3},
    {name: 'energy-efficient', display: 'Energy Efficient ⚡', source: ['AI'], rank: 3},
    {name: 'modern-design', display: 'Modern Design 🆕', source: ['AI'], rank: 3},
    {name: 'classic-design', display: 'Classic Design 🏛️', source: ['AI'], rank: 3},
    {name: 'gym', display: 'Gym 💪', source: ['AI', 'Analysis'], rank: 3},
    {name: 'pool', display: 'Pool 🏊', source: ['AI', 'Analysis'], rank: 3},
    {name: 'rooftop-access', display: 'Rooftop Access 🚀', source: ['AI', 'Analysis'], rank: 3},
    {name: 'concierge-service', display: 'Concierge Service 🤵', source: ['AI', 'Analysis'], rank: 3},
    {name: 'in-unit-laundry', display: 'In Unit Laundry 🧺', source: ['AI', 'Analysis'], rank: 3},
    {name: 'dishwasher', display: 'Dishwasher 🧼', source: ['AI', 'Analysis'], rank: 3},
    {name: 'doorman', display: 'Doorman 🚪', source: ['AI', 'Analysis'], rank: 3},
    {name: 'private-balcony', display: 'Private Balcony 🪑', source: ['AI', 'Analysis'], rank: 3},
    {name: 'shared-outdoor-space', display: 'Shared Outdoor Space 🌳', source: ['AI', 'Analysis'], rank: 3}
  ],
  'Transportation': [
    {name: 'great-subway-access', display: 'Great Transportation 🚄', source: ['Analysis'], rank: 2},
    {name: 'fair-subway-access', display: 'Fair Transportation 👌', source: ['Analysis'], rank: 2},
    {name: 'good-subway-access', display: 'Good Transportation 👍', source: ['Analysis'], rank: 2},
    {name: 'poor-subway-access', display: 'Poor Transportation 👎', source: ['Analysis'], rank: 2},
    {name: 'close-to-bus-stop', display: 'Close to Bus Stop 🚌', source: ['AI', 'Analysis'], rank: 3},
    {name: 'far-from-bus-stop', display: 'Far from Bus Stop 🚖', source: ['AI', 'Analysis'], rank: 3},
    {name: 'close-to-subway', display: 'Close to Subway 🚉', source: ['AI', 'Analysis'], rank: 3},
    {name: 'far-from-subway', display: 'Far from Subway 🚖', source: ['AI', 'Analysis'], rank: 3},
    {name: 'bike-friendly', display: 'Bike Friendly 🚴', source: ['AI', 'Analysis'], rank: 3},
    {name: 'parking-available', display: 'Parking Available 🚗', source: ['AI', 'Analysis'], rank: 3}
  ]
};

// Create tag lookup maps for efficient access
const tagNameToDisplay = new Map<string, string>();
const tagDisplayToName = new Map<string, string>();
const allTags = new Map<string, Tag>();

// Initialize lookup maps
for (const category in tagCategories) {
  for (const tag of tagCategories[category as keyof typeof tagCategories]) {
    tagNameToDisplay.set(tag.name, tag.display);
    tagDisplayToName.set(tag.display, tag.name);
    allTags.set(tag.name, tag);
  }
}

/**
 * Returns the display version of a tag (with emoji)
 * @param tagName System tag name (without emoji)
 * @returns Display tag (with emoji)
 */
export function getDisplayTag(tagName: string): string {
  return tagNameToDisplay.get(tagName) || tagName;
}

/**
 * Returns the system tag name from a display tag
 * @param displayTag Display tag (with emoji)
 * @returns System tag name (without emoji)
 */
export function getSystemTag(displayTag: string): string {
  return tagDisplayToName.get(displayTag) || displayTag;
}

/**
 * Checks if a tag exists in the system
 * @param tagName The tag name to check
 * @returns True if the tag exists
 */
export function tagExists(tagName: string): boolean {
  return allTags.has(tagName);
}

/**
 * Gets all tag names in a specific category
 * @param category The category name
 * @returns Array of tag names
 */
export function getTagsInCategory(category: keyof typeof tagCategories): string[] {
  return tagCategories[category].map(tag => tag.name);
}

/**
 * Finds which category a tag belongs to
 * @param tagName The tag name to look up
 * @returns The category name or undefined if not found
 */
export function findTagCategory(tagName: string): string | undefined {
  for (const category in tagCategories) {
    if (tagCategories[category as keyof typeof tagCategories].some(tag => tag.name === tagName)) {
      return category;
    }
  }
  return undefined;
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
    tag_list: property.tag_list.map(tag => toDisplay ? getDisplayTag(tag) : getSystemTag(tag))
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