'use client';

import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";
import FeatureTags from "@/app/ui/badges/FeatureTags";
import QualityBadges from "@/app/ui/badges/QualityBadges";

export default function ListingsDescriptionPanel({ listingDetails }: { listingDetails: CombinedPropertyDetails }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-base-content">Description Summary</h2>
              <QualityBadges tags={listingDetails.tag_list || []} mode="inline" dimension="size" />
            </div>
            <div className="flex flex-wrap gap-1">
                <FeatureTags category="Features" tags={listingDetails.tag_list || []} />
            </div>
            <p className="text-base-content/80 leading-relaxed text-sm">
              {listingDetails.description_summary}
            </p>
            {/* Pass state and toggle handler to the ExpandButton */}
            <div className="">
                <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} expandedText="Hide Original Description" collapsedText="Show Original Description" />
            </div>
            {/* Panel that expands/collapses */}
            <div
                className={`transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? 'opacity-100 max-h-[1000px] mt-2 overflow-visible'
                      : 'opacity-0 max-h-0 mt-0 overflow-hidden'
                  }`}
            >
                <p className="text-base-content/80 leading-relaxed text-sm">
                {listingDetails.description}
                </p>
            </div>
        </div>
    )
}