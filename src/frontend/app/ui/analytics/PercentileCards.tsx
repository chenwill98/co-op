import React from 'react';

interface PercentileCardsProps {
  allPercentile: number;
  boroughPercentile: number;
  neighborhoodPercentile: number;
  allLabel?: string;
  boroughLabel?: string;
  neighborhoodLabel?: string;
}

/**
 * Reusable component to display percentile data across different metrics
 */
export default function PercentileCards({
  allPercentile = 0,
  boroughPercentile = 0,
  neighborhoodPercentile = 0,
  allLabel = "Percentile among all listings",
  boroughLabel = "Percentile within borough",
  neighborhoodLabel = "Percentile within neighborhood",
}: PercentileCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      {/* All Listings Percentile */}
      <div className="p-3 bg-base-200 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="font-semibold text-lg mb-1">
          {(allPercentile ?? 0).toFixed(1)}th
        </div>
        <div className="text-xs text-base-content/60">
          {allLabel}
        </div>
      </div>
      
      {/* Borough Percentile */}
      <div className="p-3 bg-base-200 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="font-semibold text-lg mb-1">
          {(boroughPercentile ?? 0).toFixed(1)}th
        </div>
        <div className="text-xs text-base-content/60">
          {boroughLabel}
        </div>
      </div>
      
      {/* Neighborhood Percentile */}
      <div className="p-3 bg-base-200 rounded-lg flex flex-col items-center justify-center text-center">
        <div className="font-semibold text-lg mb-1">
          {(neighborhoodPercentile ?? 0).toFixed(1)}th
        </div>
        <div className="text-xs text-base-content/60">
          {neighborhoodLabel}
        </div>
      </div>
    </div>
  );
}