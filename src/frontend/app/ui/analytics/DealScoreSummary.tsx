'use client';

import { CombinedPropertyDetails } from "@/app/lib/definitions";

type ScoreLevel = 'great' | 'good' | 'average' | 'below';

interface DealDimension {
  label: string;
  description: string;
  level: ScoreLevel;
}

function getLevel(percentile: number | undefined | null): ScoreLevel | null {
  if (percentile == null) return null;
  if (percentile >= 75) return 'great';
  if (percentile >= 50) return 'good';
  if (percentile >= 25) return 'average';
  return 'below';
}

const levelConfig: Record<ScoreLevel, { color: string; text: string }> = {
  great: { color: 'bg-success', text: 'Great' },
  good: { color: 'bg-info', text: 'Above avg' },
  average: { color: 'bg-warning', text: 'Average' },
  below: { color: 'bg-error', text: 'Below avg' },
};

export default function DealScoreSummary({
  listingDetails,
}: {
  listingDetails: CombinedPropertyDetails;
}) {
  const dimensions: DealDimension[] = [];

  // Price (inverted: lower percentile = better price for renter)
  const priceLevel = getLevel(
    listingDetails.price_neighborhood_percentile != null
      ? 100 - listingDetails.price_neighborhood_percentile
      : null
  );
  if (priceLevel) {
    const descriptions: Record<ScoreLevel, string> = {
      great: 'Great price for the area',
      good: 'Good price for the area',
      average: 'Average price for the area',
      below: 'Above average price',
    };
    dimensions.push({ label: 'Price', description: descriptions[priceLevel], level: priceLevel });
  }

  // Size
  const sizeLevel = getLevel(listingDetails.sqft_neighborhood_percentile);
  if (sizeLevel) {
    const descriptions: Record<ScoreLevel, string> = {
      great: 'Very spacious for the price',
      good: 'Above average size',
      average: 'Average size',
      below: 'Below average size',
    };
    dimensions.push({ label: 'Size', description: descriptions[sizeLevel], level: sizeLevel });
  }

  // Amenities
  const amenityLevel = getLevel(listingDetails.amenity_neighborhood_percentile);
  if (amenityLevel) {
    const descriptions: Record<ScoreLevel, string> = {
      great: 'Excellent amenities',
      good: 'Good amenities',
      average: 'Average amenities',
      below: 'Limited amenities',
    };
    dimensions.push({ label: 'Amenities', description: descriptions[amenityLevel], level: amenityLevel });
  }

  // Subway access
  const subwayLevel = getLevel(listingDetails.subway_neighborhood_access_percentile);
  if (subwayLevel) {
    const descriptions: Record<ScoreLevel, string> = {
      great: 'Excellent subway access',
      good: 'Good subway access',
      average: 'Average subway access',
      below: 'Limited subway access',
    };
    dimensions.push({ label: 'Subway', description: descriptions[subwayLevel], level: subwayLevel });
  }

  // POI / Location
  const poiLevel = getLevel(listingDetails.poi_neighborhood_access_percentile);
  if (poiLevel) {
    const descriptions: Record<ScoreLevel, string> = {
      great: 'Great nearby spots',
      good: 'Good nearby spots',
      average: 'Average nearby spots',
      below: 'Few nearby spots',
    };
    dimensions.push({ label: 'Location', description: descriptions[poiLevel], level: poiLevel });
  }

  if (dimensions.length === 0) return null;

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-semibold text-base-content mb-2">Deal Summary</h2>
      <div className="space-y-1.5">
        {dimensions.map((dim) => {
          const config = levelConfig[dim.level];
          return (
            <div key={dim.label} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${config.color} shrink-0`} />
              <span className="text-sm font-medium text-base-content w-16 shrink-0">{dim.label}</span>
              <span className="text-sm text-base-content/70">{dim.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
