'use client';

import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { TagList } from "@/app/ui/utilities";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";

export default function ListingsAmentitiesPanel({ listingDetails }: { listingDetails: CombinedPropertyDetails }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };
    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-gray-800">
            Amentities
            </h2>
            <div className="flex flex-wrap gap-1">
                <TagList category="Amenities" tags={listingDetails.tags || []} />
            </div>
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
                This is some additional dummy information that is revealed when the button is clicked.
                </p>
            </div>
        </div>
    )
}