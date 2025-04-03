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
  
  return (
    <div className="flex flex-wrap gap-1">
      {filteredTags.map(tag => (
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
export function FormatNeighborhoodText(text: string) {
  return text.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}