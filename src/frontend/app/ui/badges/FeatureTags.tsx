import { tagCategories, getDisplayTag, getTagsInCategory, isQualityTag } from '@/app/lib/tagUtils';

interface FeatureTagsProps {
  tags: string[];
  /** Filter to tags in this category only */
  category?: keyof typeof tagCategories;
  /** Compact mode: smaller, no emoji */
  compact?: boolean;
}

/**
 * Renders non-quality (feature) tags with emoji display names.
 * Quality tags are excluded — use QualityBadges for those.
 */
export default function FeatureTags({ tags, category, compact }: FeatureTagsProps) {
  if (!tags || tags.length === 0) return null;

  const uniqueTags = [...new Set(tags)];

  // Filter to category if provided, then exclude quality tags
  let filtered = category
    ? uniqueTags.filter(tag => getTagsInCategory(category).includes(tag))
    : uniqueTags;
  filtered = filtered.filter(tag => !isQualityTag(tag));

  if (filtered.length === 0) return null;

  // Build rank map for sort order
  const rankMap = Object.values(tagCategories).flat().reduce((acc, tagObj) => {
    acc[tagObj.name] = tagObj.rank;
    return acc;
  }, {} as Record<string, number>);

  const displayTags = [...filtered]
    .sort((a, b) => (rankMap[a] ?? Infinity) - (rankMap[b] ?? Infinity))
    .slice(0, 4);

  if (compact) {
    return (
      <div className="flex flex-nowrap gap-1 overflow-x-clip overflow-y-visible">
        {displayTags.map(tag => {
          const display = getDisplayTag(tag)
            .replace(/\s*[\p{Emoji_Presentation}\p{Extended_Pictographic}]+\s*/gu, '')
            .trim();
          return (
            <div
              key={tag}
              className="badge badge-sm glass-badge-primary rounded-full text-[0.65rem] leading-tight py-0.5 h-auto min-h-0 px-1.5 flex-shrink-0 font-medium"
              title={tag}
            >
              {display}
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
