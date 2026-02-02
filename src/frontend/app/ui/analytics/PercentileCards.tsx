'use client';

import React, { useState, useEffect } from 'react';

interface PercentileCardsProps {
  allPercentile: number | null;
  boroughPercentile: number | null;
  neighborhoodPercentile: number | null;
  allLabel?: string;
  boroughLabel?: string;
  neighborhoodLabel?: string;
}

/**
 * Animated counter that counts up from 0 to the target value
 */
function AnimatedCounter({ value, duration = 500 }: { value: number | null; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (value === null || hasAnimated) return;

    const target = Math.round(value);
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (target - startValue) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setHasAnimated(true);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, hasAnimated]);

  if (value === null) return <>--</>;
  return <>{displayValue}</>;
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
      <div className="text-base-content/70 mb-2 text-sm">Percentile rankings:</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* All Listings Percentile */}
        <div className="p-3 glass-panel-nested rounded-lg flex flex-col items-center text-center">
          <div className="font-semibold text-lg mb-1 text-primary">
            <AnimatedCounter value={allPercentile} />th
          </div>
          <div className="text-xs text-base-content/70">
            {allLabel}
          </div>
        </div>

        {/* Borough Percentile */}
        <div className="p-3 glass-panel-nested rounded-lg flex flex-col items-center text-center">
          <div className="font-semibold text-lg mb-1 text-primary">
            <AnimatedCounter value={boroughPercentile} />th
          </div>
          <div className="text-xs text-base-content/70">
            {boroughLabel}
          </div>
        </div>

        {/* Neighborhood Percentile */}
        <div className="p-3 glass-panel-nested rounded-lg flex flex-col items-center text-center">
          <div className="font-semibold text-lg mb-1 text-primary">
            <AnimatedCounter value={neighborhoodPercentile} />th
          </div>
          <div className="text-xs text-base-content/70">
            {neighborhoodLabel}
          </div>
        </div>
      </div>
    </div>
  );
}