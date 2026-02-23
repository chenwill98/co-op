'use client';

import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { TagList, FormatDisplayText } from "@/app/ui/utilities";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";
import PercentileCards from "@/app/ui/analytics/PercentileCards";
import TooltipIcon from "@/app/ui/icons/TooltipIcon";

export default function ListingsDetailsPanel({ listingDetails }: { listingDetails: CombinedPropertyDetails }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };
    return (
        <div className="flex flex-col items-start gap-1">
            <h1 className="text-3xl font-semibold text-base-content mb-1">
              {listingDetails.address}
            </h1>
            <div className="flex flex-wrap gap-1">
                <TagList category="Popularity" tags={listingDetails.tag_list || []} />
            </div>
            <p className="mt-1 text-sm text-base-content">
              {FormatDisplayText(listingDetails.property_type || '')} in {FormatDisplayText(listingDetails.neighborhood)},{" "}
              {FormatDisplayText(listingDetails.borough)} &mdash; {listingDetails.zipcode}
            </p>
            <div className="text-base-content/80 text-sm space-x-1">
              <span>
                {listingDetails.bedrooms}{" "}
                {listingDetails.bedrooms && listingDetails.bedrooms % 1 === 0 ? (listingDetails.bedrooms === 1 ? "bed" : "beds") : "beds"}
              </span>
              <span>•</span>
              <span>
                {listingDetails.bathrooms}{" "}
                {listingDetails.bathrooms && listingDetails.bathrooms % 1 === 0 ? (listingDetails.bathrooms === 1 ? "bath" : "baths") : "baths"}
              </span>
              <span>•</span>
              <span>
                {listingDetails.sqft === null || listingDetails.sqft === 0 ? "-" : listingDetails.sqft} ft
                <sup>2</sup>
              </span>
              <span>•</span>
              <span>
                $
                {listingDetails.sqft === null || listingDetails.sqft === 0
                  ? "-"
                  : (listingDetails.price / listingDetails.sqft).toFixed(2)}{" "}
                per ft<sup>2</sup>
              </span>
            </div>
            <div className="">
                <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} expandedText="Hide Property Insights" collapsedText="Show Property Insights" />
            </div>
            {/* Panel that expands/collapses */}
            <div
                className={`transition-all duration-300 ease-in-out ${
                  isExpanded
                    ? 'opacity-100 max-h-[1000px] mt-2 overflow-visible'
                    : 'opacity-0 max-h-0 mt-0 overflow-hidden'
                }`}
            >
                <div className="flex flex-row items-center gap-2 mb-2">
                  <h3 className="text-xs uppercase tracking-wide text-base-content/60">Sq. Footage Analytics</h3>
                  <TooltipIcon tooltipText="Sq. footage percentile is a measure of the size of a property relative to other properties with the same number of bedrooms and in the same price band." />
                </div>
                <PercentileCards 
                  allPercentile={listingDetails.sqft_percentile ?? null}
                  boroughPercentile={listingDetails.sqft_borough_percentile ?? null}
                  neighborhoodPercentile={listingDetails.sqft_neighborhood_percentile ?? null}
                />
            </div>
          </div>
    );
}