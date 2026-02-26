import { tagCategories, getDisplayTag, getTagsInCategory } from '@/app/lib/tagUtils';

/**
 * Maps a tag name to a color-coded level and short label for compact display.
 * Analytics tags with great-/good-/fair-/poor- prefixes get sentiment colors.
 * Feature/AI tags get a neutral primary style.
 */
function getCompactTagInfo(tag: string): { badgeClass: string; levelText: string; label: string } | null {
  // Analytics tags with sentiment prefixes
  const sentimentMap: Record<string, { badgeClass: string; text: string }> = {
    'great': { badgeClass: 'glass-badge-success', text: 'Great' },
    'good':  { badgeClass: 'glass-badge-info',    text: 'Good' },
    'fair':  { badgeClass: 'glass-badge-warning',  text: 'Fair' },
    'poor':  { badgeClass: 'glass-badge-error',    text: 'Below avg' },
  };

  // Label overrides for cleaner compact display
  const labelOverrides: Record<string, string> = {
    'subway-access': 'subway',
    'deal': 'deal',
    'price': 'price',
    'amenities': 'amenities',
    'location': 'location',
    'size': 'size',
  };

  for (const [prefix, config] of Object.entries(sentimentMap)) {
    if (tag.startsWith(`${prefix}-`)) {
      const rest = tag.slice(prefix.length + 1);
      const label = labelOverrides[rest] || rest.replace(/-/g, ' ');
      return { badgeClass: config.badgeClass, levelText: config.text, label };
    }
  }

  // Special standalone tags
  const specialTags: Record<string, { badgeClass: string; levelText: string; label: string }> = {
    'spacious':     { badgeClass: 'glass-badge-success', levelText: '', label: 'Spacious' },
    'average-size': { badgeClass: 'glass-badge-warning', levelText: '', label: 'Avg size' },
    'cramped':      { badgeClass: 'glass-badge-error',   levelText: '', label: 'Cramped' },
    'price-drop':   { badgeClass: 'glass-badge-success', levelText: '', label: 'Price drop' },
    'price-increase': { badgeClass: 'glass-badge-error', levelText: '', label: 'Price up' },
    'new':          { badgeClass: 'glass-badge-info',    levelText: '', label: 'New' },
    'long-time-listed': { badgeClass: 'glass-badge-warning', levelText: '', label: 'Listed long' },
    'pre-war':      { badgeClass: 'glass-badge-primary', levelText: '', label: 'Pre-war' },
  };
  if (specialTags[tag]) return specialTags[tag];

  // Feature/AI tags — neutral primary style, display name without emoji
  const display = getDisplayTag(tag).replace(/\s*[\p{Emoji_Presentation}\p{Extended_Pictographic}]+\s*/gu, '').trim();
  return { badgeClass: 'glass-badge-primary', levelText: '', label: display };
}

/**
 * Displays a list of tags for a specific category
 * Uses the new hyphenated tag system and displays tags with emojis
 * If category is null, all tags will be displayed without filtering
 * Compact mode uses color-coded badges without emojis
 */
export function TagList({ category, tags, compact }: { category?: keyof typeof tagCategories; tags: string[]; compact?: boolean }) {
  if (!tags || tags.length === 0) {
    return null;
  }

  // Deduplicate tags (defense in depth - view should already be deduplicated)
  const uniqueTags = [...new Set(tags)];

  // If category is provided, filter tags that belong to that category
  // Otherwise, use all tags
  const filteredTags = category
    ? uniqueTags.filter(tag => getTagsInCategory(category).includes(tag))
    : uniqueTags;

  if (filteredTags.length === 0) {
    return null;
  }

  // build map of tag name to its rank
  const rankMap = Object.values(tagCategories).flat().reduce((acc, tagObj) => {
    acc[tagObj.name] = tagObj.rank;
    return acc;
  }, {} as Record<string, number>);
  // order by rank ascending and take first 4
  const displayTags = [...filteredTags]
    .sort((a, b) => (rankMap[a] ?? Infinity) - (rankMap[b] ?? Infinity))
    .slice(0, 4);

  if (compact) {
    return (
      <div className="flex flex-nowrap gap-1 overflow-x-clip overflow-y-visible">
        {displayTags.map(tag => {
          const info = getCompactTagInfo(tag);
          if (!info) return null;
          return (
            <div
              key={tag}
              className={`badge badge-sm ${info.badgeClass} rounded-full text-[0.65rem] leading-tight py-0.5 h-auto min-h-0 px-1.5 gap-0.5 flex-shrink-0`}
              title={tag}
            >
              {info.levelText && <span className="font-semibold">{info.levelText}</span>}
              <span className={info.levelText ? "opacity-70" : "font-medium"}>{info.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {displayTags.map(tag => (
        <div
          key={tag}
          className="badge glass-badge-primary text-primary rounded-full text-xs"
          title={tag}
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