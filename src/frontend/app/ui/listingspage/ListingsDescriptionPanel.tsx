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
            <h2 className="text-2xl font-bold text-gray-800">
              About Summary ✨
            </h2>
            <p className="mt-2 text-gray-700 leading-relaxed">
              {listingDetails.description_summary}
            </p>
            {/* Pass state and toggle handler to the ExpandButton */}
            <div className="">
                <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} />
            </div>
            {/* Panel that expands/collapses */}
            <div
                className={`overflow-hidden transition-max-height duration-500 ease-in-out ${
                isExpanded ? 'max-h-40' : 'max-h-0'
                }`}
            >
                <p className="mt-2 text-gray-700">
                {listingDetails.description}
                </p>
            </div>
        </div>
    )
}