'use client';

import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";

export default function ListingsDescriptionPanel({ listingDetails }: { listingDetails: CombinedPropertyDetails }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };
    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-gray-800">
              About Summary ✨
            </h2>
            <p className="mt-2 text-gray-700 leading-relaxed text-sm">
              {listingDetails.description_summary}
            </p>
            {/* Pass state and toggle handler to the ExpandButton */}
            <div className="">
                <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} expandedText="Hide Original Description" collapsedText="Show Original Description" />
            </div>
            {/* Panel that expands/collapses */}
            <div
                className={`overflow-hidden transition-max-height duration-500 ease-in-out ${
                isExpanded ? 'max-h-[1000px]' : 'max-h-0'
                }`}
            >
                <p className="mt-2 text-gray-700 text-sm">
                {listingDetails.description}
                </p>
            </div>
        </div>
    )
}