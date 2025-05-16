import { tagCategories, getDisplayTag, getTagsInCategory } from '@/app/lib/tagUtils';

/**
 * Displays a list of tags for a specific category
 * Uses the new hyphenated tag system and displays tags with emojis
 * If category is null, all tags will be displayed without filtering
 */
export function TagList({ category, tags }: { category?: keyof typeof tagCategories; tags: string[] }) {
  if (!tags || tags.length === 0) {
    return null;
  }
  
  // If category is provided, filter tags that belong to that category
  // Otherwise, use all tags
  const filteredTags = category 
    ? tags.filter(tag => getTagsInCategory(category).includes(tag))
    : tags;
  
  if (filteredTags.length === 0) {
    return null;
  }
  
  // build map of tag name to its rank
  const rankMap = Object.values(tagCategories).flat().reduce((acc, tagObj) => {
    acc[tagObj.name] = tagObj.rank;
    return acc;
  }, {} as Record<string, number>);
  // order by rank ascending and take first 5
  const displayTags = [...filteredTags]
    .sort((a, b) => (rankMap[a] ?? Infinity) - (rankMap[b] ?? Infinity))
    .slice(0, 4);
  
  return (
    <div className="flex flex-wrap gap-1">
      {displayTags.map(tag => (
        <div 
          key={tag} 
          className="badge bg-primary/10 text-primary rounded-full text-xs"
          title={tag} // Show the system tag on hover for debugging
        >
          {getDisplayTag(tag)}
        </div>
      ))}
    </div>
  );
}

// Convert neighborhood text from, for example, hells-kitchen to Hells Kitchen for display purposes
export function FormatDisplayText(text?: string) {
  if (!text) return '';
  return text.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

// Format amenity name for display
export function formatAmenityName(name: string) {
  // Special formatting for certain amenities
  const amenityNameOverrides: Record<string, string> = {
      "central_ac": "Central AC",
      "pied_a_terre": "Pied-à-terre",
      "washer_dryer": "In-Unit Washer/Dryer",
      "nyc_evacuation_1": "NYC Evacuation Zone 1",
      "nyc_evacuation_2": "NYC Evacuation Zone 2",
      "nyc_evacuation_3": "NYC Evacuation Zone 3",
      "nyc_evacuation_5": "NYC Evacuation Zone 5",
      "nyc_evacuation_6": "NYC Evacuation Zone 6",
      "fios_available": "Fios Available",
      "co_purchase": "Co-Purchase Allowed",
      "childrens_playroom": "Children's Playroom",
      "live_in_super": "Live-in Super",
      "full_time_doorman": "Full-Time Doorman",
      "part_time_doorman": "Part-Time Doorman",
      "virtual_doorman": "Virtual Doorman",
      "pets": "Allows Pets"
  };
  // Check if we have an override for this amenity name
  if (amenityNameOverrides[name]) {
      return amenityNameOverrides[name];
  }
  
  // Default formatting
  return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}