'use client';

import { useState, useEffect } from 'react';
import ExpandButton from '@/app/ui/icons/ExpandButton';
import Link from 'next/link';

interface BuildingUnit {
  id: string;
  address: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  no_fee: boolean;
  thumbnail_image: string | null;
}

export default function BuildingUnitsPanel({
  propertyId,
  buildingId,
  currentPrice,
  currentSqft,
}: {
  propertyId: string;
  buildingId: string | null;
  currentPrice: number;
  currentSqft: number | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [units, setUnits] = useState<BuildingUnit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buildingId || !isExpanded || units !== null) return;

    let cancelled = false;
    setLoading(true);

    async function fetchUnits() {
      try {
        const res = await fetch(`/api/properties/${propertyId}/building-units`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (!cancelled) {
          setUnits(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load building units');
          setLoading(false);
        }
      }
    }

    fetchUnits();
    return () => { cancelled = true; };
  }, [buildingId, isExpanded, propertyId, units]);

  // Don't render at all if no building_id
  if (!buildingId) return null;

  const unitCount = units?.length ?? null;

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-semibold text-base-content mb-2">
        Other Units in This Building
        {unitCount !== null && unitCount > 0 && (
          <span className="text-base-content/50 text-sm font-normal ml-2">({unitCount})</span>
        )}
      </h2>
      <ExpandButton
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(prev => !prev)}
        collapsedText="Show Units"
        expandedText="Hide Units"
      />
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'opacity-100 max-h-[2000px] mt-2 overflow-visible'
            : 'opacity-0 max-h-0 mt-0 overflow-hidden'
        }`}
      >
        {loading && (
          <div className="flex items-center py-4">
            <span className="loading loading-spinner loading-sm text-primary" />
            <span className="ml-2 text-sm text-base-content/60">Loading units...</span>
          </div>
        )}
        {error && <div className="text-sm text-error py-2">{error}</div>}
        {units && units.length === 0 && (
          <div className="text-sm text-base-content/60 py-2">No other active listings in this building</div>
        )}
        {units && units.length > 0 && (
          <div className="space-y-2">
            {units.map((unit) => {
              const priceDiff = unit.price - currentPrice;
              const unitPricePerSqft = unit.sqft && unit.sqft > 0 ? unit.price / unit.sqft : null;
              const currentPricePerSqft = currentSqft && currentSqft > 0 ? currentPrice / currentSqft : null;

              return (
                <Link
                  key={unit.id}
                  href={`/listings/${unit.id}`}
                  className="glass-panel-nested rounded-lg p-3 block hover:bg-base-200/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-base-content">
                        {unit.bedrooms ?? 0}BR / {unit.bathrooms ?? 0}BA
                        {unit.sqft && unit.sqft > 0 && (
                          <span className="text-base-content/60"> &middot; {unit.sqft} ft&sup2;</span>
                        )}
                      </div>
                      <div className="text-sm text-base-content/70 mt-0.5">
                        {priceDiff < 0 && (
                          <span className="text-success">${Math.abs(priceDiff).toLocaleString()} less</span>
                        )}
                        {priceDiff > 0 && (
                          <span className="text-warning">${priceDiff.toLocaleString()} more</span>
                        )}
                        {priceDiff === 0 && (
                          <span className="text-base-content/50">Same price</span>
                        )}
                        {unitPricePerSqft && currentPricePerSqft && (
                          <span className="text-base-content/50 ml-2">
                            $/ft&sup2;: ${unitPricePerSqft.toFixed(2)} vs ${currentPricePerSqft.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-base-content">
                        ${unit.price.toLocaleString()}
                      </div>
                      {unit.no_fee && (
                        <span className="badge badge-xs glass-badge-success rounded-full">No Fee</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
