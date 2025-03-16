'use client';

import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { TagList } from "@/app/ui/utilities";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";

export default function ListingsDetailsPanel({ listingDetails }: { listingDetails: CombinedPropertyDetails }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };
    return (
        <div className="flex flex-col items-start gap-1">
            <h1 className="text-3xl font-semibold text-gray-800">
              {listingDetails.address}
            </h1>
            <div className="flex flex-wrap gap-1">
                <TagList category="Popularity" tags={listingDetails.tag_list || []} />
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {listingDetails.property_type} in {listingDetails.neighborhood},{" "}
              {listingDetails.borough} &mdash; {listingDetails.zipcode}
            </p>
            <div className="text-gray-500 text-sm space-x-1">
              <span>
                {listingDetails.bedrooms}{" "}
                {listingDetails.bedrooms && listingDetails.bedrooms % 1 === 0 ? (listingDetails.bedrooms === 1 ? "bed" : "beds") : "beds"}
              </span>
              <span>|</span>
              <span>
                {listingDetails.bathrooms}{" "}
                {listingDetails.bathrooms && listingDetails.bathrooms % 1 === 0 ? (listingDetails.bathrooms === 1 ? "bath" : "baths") : "baths"}
              </span>
              <span>|</span>
              <span>
                {listingDetails.sqft === null || listingDetails.sqft === 0 ? "-" : listingDetails.sqft} ft
                <sup>2</sup>
              </span>
              <span>|</span>
              <span>
                $
                {listingDetails.sqft === null || listingDetails.sqft === 0
                  ? "-"
                  : (listingDetails.price / listingDetails.sqft).toFixed(2)}{" "}
                per ft<sup>2</sup>
              </span>
            </div>
            <div className="">
                <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} expandedText="Hide Market Trends" collapsedText="Show Market Trends" />
            </div>
            {/* Panel that expands/collapses */}
            <div
                className={`transition-all duration-300 ease-in-out ${
                isExpanded 
                  ? 'opacity-100 max-h-[800px] mt-4 visible' 
                  : 'opacity-0 max-h-0 mt-0 invisible'
                }`}
            >
                <p className="text-gray-700 text-sm">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
            </div>
          </div>
    );
}