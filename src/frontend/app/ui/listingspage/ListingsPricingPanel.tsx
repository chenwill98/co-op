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
      <h2 className="text-2xl font-semibold text-gray-800">Price</h2>
      <div className="flex flex-wrap gap-1">
          <TagList category="Price" tags={listingDetails.tag_list || []} />
      </div>
      <div>
        <div className="text-2xl font-bold">
          ${listingDetails.price.toLocaleString()} per month
        </div>
        {!listingDetails.no_fee && (
          <div className="text-lg font-semibold">
            ${(listingDetails.price + listingDetails.price * 0.15).toLocaleString()}
            <span className="text-gray-500 text-sm"> net effective rent</span>
          </div>
        )}
        {!listingDetails.no_fee && (
          <div className="text-lg font-semibold">
            ${(listingDetails.price * 0.15 * 12).toLocaleString()}
            <span className="text-gray-500 text-sm"> total fees</span>
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
            ? 'opacity-100 max-h-[800px] mt-4 visible' 
            : 'opacity-0 max-h-0 mt-0 invisible'
        }`}
      >
        <p className="text-gray-700">
          This is some additional dummy information that is revealed when the button is clicked.
        </p>
      </div>
    </div>
  );
}