import {
  isQualityTag,
  getQualityTier,
  dimensionPriority,
  type QualityTier,
} from '@/app/lib/tagUtils';

const tierConfig: Record<QualityTier, { emoji: string; text: string }> = {
  great: { emoji: '⭐', text: 'Great' },
  good:  { emoji: '🟢', text: 'Good' },
  fair:  { emoji: '🟡', text: 'Fair' },
  low:   { emoji: '🔴', text: 'Poor' },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface QualityBadgesProps {
  tags: string[];
  /** 'compact' for search cards (single row, max 4); 'summary' for detail page (wrap, all shown); 'inline' for panel title embedding */
  mode: 'compact' | 'summary' | 'inline';
  /** When set, only renders the badge for this specific dimension */
  dimension?: string;
}

/**
 * Renders quality-tier badges from tag_list.
 * Picks one tag per dimension, sorted by dimension priority.
 */
export default function QualityBadges({ tags, mode, dimension }: QualityBadgesProps) {
  if (!tags || tags.length === 0) return null;

  // Collect one quality tag per dimension (first occurrence wins)
  const seen = new Set<string>();
  const badges: { tag: string; tier: QualityTier; dimension: string; label: string }[] = [];

  for (const tag of tags) {
    if (!isQualityTag(tag)) continue;
    const info = getQualityTier(tag)!;
    if (seen.has(info.dimension)) continue;
    seen.add(info.dimension);
    badges.push({ tag, tier: info.tier, dimension: info.dimension, label: info.label });
  }

  if (badges.length === 0) return null;

  // Filter to specific dimension if requested
  const filtered = dimension ? badges.filter(b => b.dimension === dimension) : badges;
  if (filtered.length === 0) return null;

  // Sort by dimension priority
  filtered.sort(
    (a, b) => dimensionPriority.indexOf(a.dimension) - dimensionPriority.indexOf(b.dimension)
  );

  const displayed = mode === 'compact' ? filtered.slice(0, 4) : filtered;

  // Inline mode: single badge without wrapper, for embedding in panel titles
  // Sized to match FeatureTags (badge glass-badge-primary text-xs rounded-full)
  if (mode === 'inline') {
    const badge = displayed[0];
    if (!badge) return null;
    const config = tierConfig[badge.tier];
    const isSizeTag = badge.dimension === 'size';
    return (
      <span
        className="badge glass-badge-primary text-primary rounded-full text-xs gap-1 align-middle"
        title={badge.tag}
      >
        <span>{config.emoji}</span>
        {isSizeTag ? (
          <span className="font-semibold">{badge.label}</span>
        ) : (
          <>
            <span className="font-semibold">{config.text}</span>
            <span className="font-semibold">{capitalize(badge.label)}</span>
          </>
        )}
      </span>
    );
  }

  if (mode === 'compact') {
    return (
      <div className="flex flex-nowrap gap-1 overflow-x-clip overflow-y-visible">
        {displayed.map(({ tag, tier, dimension, label }) => {
          const config = tierConfig[tier];
          const isSizeTag = dimension === 'size';
          return (
            <div
              key={tag}
              className="badge badge-sm glass-badge-primary rounded-full text-[0.6rem] leading-tight py-0.5 h-auto min-h-0 px-1 gap-0.5 flex-shrink-0"
              title={tag}
            >
              <span>{config.emoji}</span>
              {isSizeTag ? (
                <span className="font-semibold">{label}</span>
              ) : (
                <>
                  <span className="font-semibold">{config.text}</span>
                  <span className="font-semibold">{capitalize(label)}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // summary mode — sized to match FeatureTags (badge glass-badge-primary text-xs rounded-full)
  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map(({ tag, tier, dimension, label }) => {
        const config = tierConfig[tier];
        const isSizeTag = dimension === 'size';
        return (
          <div
            key={tag}
            className="badge glass-badge-primary text-primary rounded-full text-xs gap-1"
            title={tag}
          >
            <span>{config.emoji}</span>
            {isSizeTag ? (
              <span className="font-semibold">{label}</span>
            ) : (
              <>
                <span className="font-semibold">{config.text}</span>
                <span className="font-semibold">{capitalize(label)}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
