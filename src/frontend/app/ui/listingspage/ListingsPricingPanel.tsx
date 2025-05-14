'use client';

import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { TagList } from "@/app/ui/utilities";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";
import PercentileCards from "@/app/ui/analytics/PercentileCards";
import TooltipIcon from "@/app/ui/icons/TooltipIcon";

export default function ListingsPricingPanel({
  listingDetails,
}: {
  listingDetails: CombinedPropertyDetails;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-semibold text-base-content mb-1">Price</h2>
      <div className="flex flex-wrap gap-1 mb-2">
          <TagList category="Price" tags={listingDetails.combined_tag_list || []} />
      </div>
      <div>
        <div className="text-2xl font-bold mb-1">
          ${listingDetails.price.toLocaleString()} per month
        </div>
        {!listingDetails.no_fee && (
          <div className="text-lg font-semibold mb-1">
            ${(listingDetails.price + listingDetails.price * listingDetails.enhanced_brokers_fee).toLocaleString()}
            <span className="text-base-content/60 text-sm"> net effective rent</span>
          </div>
        )}
        {!listingDetails.no_fee && (
          <div className="text-lg font-semibold mb-1">
            ${(listingDetails.price * listingDetails.enhanced_brokers_fee * 12).toLocaleString()}
            <span className="text-base-content/60 text-sm"> total fees</span>
          </div>
        )}
      </div>

      {/* Pass state and toggle handler to the ExpandButton */}
      <div className="">
        <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} collapsedText="Show Pricing Analytics" expandedText="Hide Pricing Analytics"/>
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
          <h3 className="text-lg font-semibold text-base-content/80">Price Analytics</h3>
          <TooltipIcon tooltipText="Price percentile is a measure of the price of a property relative to other properties with the same number of bedrooms and in the same price band." />
        </div>
        <PercentileCards 
          allPercentile={listingDetails.price_percentile ?? null}
          boroughPercentile={listingDetails.price_borough_percentile ?? null}
          neighborhoodPercentile={listingDetails.price_neighborhood_percentile ?? null}
        />
      </div>
    </div>
  );
}