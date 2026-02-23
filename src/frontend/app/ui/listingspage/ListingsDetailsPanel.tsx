'use client';

import { CombinedPropertyDetails, NeighborhoodContext } from "@/app/lib/definitions";
import { TagList, FormatDisplayText } from "@/app/ui/utilities";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";
import PercentileCards from "@/app/ui/analytics/PercentileCards";
import TooltipIcon from "@/app/ui/icons/TooltipIcon";

function ListingTimeline({
  listingDetails,
  neighborhoodContext,
}: {
  listingDetails: CombinedPropertyDetails;
  neighborhoodContext?: NeighborhoodContext | null;
}) {
  const items: React.ReactNode[] = [];

  // Days on market
  if (listingDetails.days_on_market != null) {
    const dom = listingDetails.days_on_market;
    let domText: string;
    if (dom < 3) {
      domText = 'New listing';
    } else {
      domText = `Listed ${dom} days ago`;
    }

    // Color-code if we have neighborhood avg
    let domColor = 'text-base-content/70';
    let contextHint = '';
    if (neighborhoodContext?.avg_days_on_market != null && neighborhoodContext.avg_days_on_market > 0) {
      const avg = Math.round(neighborhoodContext.avg_days_on_market);
      const bedroomLabel = listingDetails.bedrooms === 0 ? 'studio' : `${listingDetails.bedrooms}BR`;
      contextHint = ` (avg for ${bedroomLabel}: ${avg}d)`;
      if (dom < avg * 0.75) {
        domColor = 'text-success';
      } else if (dom > avg * 1.5) {
        domColor = 'text-error';
      } else {
        domColor = 'text-warning';
      }
    }

    items.push(
      <span key="dom" className={domColor}>
        {domText}{contextHint}
      </span>
    );
  }

  // Available from
  if (listingDetails.available_from) {
    const availDate = new Date(listingDetails.available_from);
    const now = new Date();
    if (availDate <= now) {
      items.push(<span key="avail" className="text-base-content/70">Available now</span>);
    } else {
      items.push(
        <span key="avail" className="text-base-content/70">
          Available {availDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      );
    }
  }

  // Built in / building age
  if (listingDetails.built_in != null && listingDetails.built_in > 0) {
    const age = new Date().getFullYear() - listingDetails.built_in;
    const isPreWar = listingDetails.built_in < 1940;
    items.push(
      <span key="built" className="text-base-content/70">
        Built {listingDetails.built_in}{isPreWar ? ' (Pre-war)' : ` (${age}y old)`}
      </span>
    );
  }

  // Market velocity
  if (neighborhoodContext?.avg_days_to_rent != null && neighborhoodContext.avg_days_to_rent > 0) {
    const avgDaysToRent = Math.round(neighborhoodContext.avg_days_to_rent);
    const bedroomLabel = listingDetails.bedrooms === 0 ? 'studios' : `${listingDetails.bedrooms}BRs`;
    items.push(
      <span key="velocity" className="text-base-content/70">
        Similar {bedroomLabel} rent within ~{avgDaysToRent}d
      </span>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="text-sm flex flex-wrap gap-x-1 gap-y-0.5">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span className="text-base-content/40 mx-1">&middot;</span>}
          {item}
        </span>
      ))}
    </div>
  );
}

export default function ListingsDetailsPanel({
  listingDetails,
  neighborhoodContext,
}: {
  listingDetails: CombinedPropertyDetails;
  neighborhoodContext?: NeighborhoodContext | null;
}) {
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

            {/* Listing Timeline */}
            <ListingTimeline listingDetails={listingDetails} neighborhoodContext={neighborhoodContext} />

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
