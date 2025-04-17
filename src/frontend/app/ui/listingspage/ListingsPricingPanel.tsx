'use client';

import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { TagList } from "@/app/ui/utilities";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";

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
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-semibold text-base-content">Price</h2>
      <div className="flex flex-wrap gap-1">
          <TagList category="Price" tags={listingDetails.tag_list || []} />
      </div>
      <div>
        <div className="text-2xl font-bold">
          ${listingDetails.price.toLocaleString()} per month
        </div>
        {!listingDetails.no_fee && (
          <div className="text-lg font-semibold">
            ${(listingDetails.price + listingDetails.price * listingDetails.actual_brokers_fee).toLocaleString()}
            <span className="text-base-content/60 text-sm"> net effective rent</span>
          </div>
        )}
        {!listingDetails.no_fee && (
          <div className="text-lg font-semibold">
            ${(listingDetails.price * listingDetails.actual_brokers_fee * 12).toLocaleString()}
            <span className="text-base-content/60 text-sm"> total fees</span>
          </div>
        )}
      </div>

      {/* Pass state and toggle handler to the ExpandButton */}
      <div className="">
        <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} />
      </div>

      {/* Panel that expands/collapses */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded 
            ? 'opacity-100 max-h-[800px] mt-4' 
            : 'opacity-0 max-h-0 mt-0 hidden'
        }`}
      >
        <p className="text-base-content/80">
          This is some additional dummy information that is revealed when the button is clicked.
        </p>
      </div>
    </div>
  );
}