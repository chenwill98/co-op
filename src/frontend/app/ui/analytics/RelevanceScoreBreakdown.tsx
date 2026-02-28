'use client';

import { CombinedPropertyDetails } from '@/app/lib/definitions';

interface ScoreComponent {
  label: string;
  value: number;
  max: number;
}

/**
 * Quartile-bucket a percentile into score tiers.
 * Matches the SQL CASE logic: <25 → 0, <50 → low, <75 → mid, ≤100 → max
 */
function bucketScore(percentile: number, tiers: [number, number, number, number]): number {
  if (percentile < 25) return tiers[0];
  if (percentile < 50) return tiers[1];
  if (percentile < 75) return tiers[2];
  return tiers[3];
}

/**
 * Sqft component uses absolute thresholds per bedroom count (not percentiles).
 * Matches the SQL CASE: cramped → 0, average → 0.375, spacious → 0.75
 */
function sqftScore(bedrooms: number | null, sqft: number | null): number | null {
  if (bedrooms == null || sqft == null || sqft <= 0) return null;

  const thresholds: Record<number, [number, number]> = {
    0: [425, 575],   // studio
    1: [600, 800],
    2: [900, 1200],
    3: [1100, 1800],
  };
  const [low, high] = thresholds[Math.min(bedrooms, 4)] ?? [1500, 2750]; // 4+ BR fallback

  if (sqft < low) return 0;
  if (sqft >= high) return 0.75;
  return 0.375;
}

function deriveComponents(details: CombinedPropertyDetails): ScoreComponent[] {
  const components: ScoreComponent[] = [];

  // Price: inverted quartile buckets on all-NYC price_percentile
  // SQL: <25p → 1.5, <50p → 1.0, <75p → 0.5, ≤100p → 0
  if (details.price_percentile != null) {
    components.push({
      label: 'Price',
      value: bucketScore(details.price_percentile, [1.5, 1.0, 0.5, 0]),
      max: 1.5,
    });
  }

  // Absolute price modifier (stored directly from SQL CASE on price_band)
  if (details.absolute_price_modifier != null) {
    components.push({
      label: 'Price modifier',
      value: Number(details.absolute_price_modifier.toFixed(2)),
      max: 1.0,
    });
  }

  // Sqft: absolute thresholds by bedroom count
  const sqft = sqftScore(details.bedrooms ?? null, details.sqft ?? null);
  if (sqft != null) {
    components.push({
      label: 'Sq Ft',
      value: sqft,
      max: 0.75,
    });
  }

  // Amenities: quartile buckets on all-NYC amenity_percentile
  // SQL: <25p → 0, <50p → 0.25, <75p → 0.5, ≤100p → 0.75
  if (details.amenity_percentile != null) {
    components.push({
      label: 'Amenities',
      value: bucketScore(details.amenity_percentile, [0, 0.25, 0.5, 0.75]),
      max: 0.75,
    });
  }

  // Subway: quartile buckets on all-NYC subway_access_percentile
  // SQL: <25p → 0, <50p → 0.33, <75p → 0.67, ≤100p → 1.0
  if (details.subway_access_percentile != null) {
    components.push({
      label: 'Subway',
      value: bucketScore(details.subway_access_percentile, [0, 0.33, 0.67, 1.0]),
      max: 1.0,
    });
  }

  // POI / Location: quartile buckets on all-NYC poi_access_percentile
  // SQL: <25p → 0, <50p → 0.17, <75p → 0.33, ≤100p → 0.5
  if (details.poi_access_percentile != null) {
    components.push({
      label: 'Location',
      value: bucketScore(details.poi_access_percentile, [0, 0.17, 0.33, 0.5]),
      max: 0.5,
    });
  }

  return components;
}

function ScoreBar({ label, value, max }: ScoreComponent) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center text-sm">
      <span className="w-24 mr-2 text-base-content/70 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-base-300/50 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/60 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="ml-2 whitespace-nowrap text-xs text-base-content/60 tabular-nums shrink-0">
        {value.toFixed(2)} / {max.toFixed(2)}
      </span>
    </div>
  );
}

export default function RelevanceScoreBreakdown({
  listingDetails,
}: {
  listingDetails: CombinedPropertyDetails;
}) {
  const score = listingDetails.relevance_score;
  if (score == null) return null;

  const maxScore = 5.5;
  const pct = Math.min((score / maxScore) * 100, 100);
  const components = deriveComponents(listingDetails);

  if (components.length === 0) return null;

  return (
    <div className="glass-panel-nested rounded-lg p-3 space-y-3">
      {/* Headline score */}
      <div className="flex items-center gap-3">
        <div>
          <span className="text-lg font-semibold">{score.toFixed(1)}</span>
          <span className="text-sm text-base-content/50"> / {maxScore}</span>
        </div>
        <div className="flex-1 h-2.5 rounded-full bg-base-300/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/70 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Component bars */}
      <div className="space-y-1.5">
        {components.map((comp) => (
          <ScoreBar key={comp.label} {...comp} />
        ))}
      </div>
    </div>
  );
}
