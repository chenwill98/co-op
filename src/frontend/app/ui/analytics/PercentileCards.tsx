import React from 'react';

interface PercentileCardsProps {
  allPercentile: number | null;
  boroughPercentile: number | null;
  neighborhoodPercentile: number | null;
  allLabel?: string;
  boroughLabel?: string;
  neighborhoodLabel?: string;
}

/**
 * Reusable component to display percentile data across different metrics
 */
export default function PercentileCards({
  allPercentile,
  boroughPercentile,
  neighborhoodPercentile,
  allLabel = "Within all listings",
  boroughLabel = "Within borough",
  neighborhoodLabel = "Within neighborhood",
}: PercentileCardsProps) {
  return (
    <div>
      <div className="text-base-content/80 mb-2">Percentile rankings:</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* All Listings Percentile */}
        <div className="p-3 bg-base-200 rounded-lg flex flex-col items-center text-center">
          <div className="font-semibold text-lg mb-1">
            {allPercentile !== null ? Math.round(allPercentile) : "--"}th
          </div>
          <div className="text-xs text-base-content/60">
            {allLabel}
          </div>
        </div>
        
        {/* Borough Percentile */}
        <div className="p-3 bg-base-200 rounded-lg flex flex-col items-center text-center">
          <div className="font-semibold text-lg mb-1">
            {boroughPercentile !== null ? Math.round(boroughPercentile) : "--"}th
          </div>
          <div className="text-xs text-base-content/60">
            {boroughLabel}
          </div>
        </div>
        
        {/* Neighborhood Percentile */}
        <div className="p-3 bg-base-200 rounded-lg flex flex-col items-center text-center">
          <div className="font-semibold text-lg mb-1">
            {neighborhoodPercentile !== null ? Math.round(neighborhoodPercentile) : "--"}th
          </div>
          <div className="text-xs text-base-content/60">
            {neighborhoodLabel}
          </div>
        </div>
      </div>
    </div>
  );
}