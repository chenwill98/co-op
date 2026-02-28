'use client';

import { CombinedPropertyDetails, NeighborhoodContext } from "@/app/lib/definitions";
import { FormatDisplayText } from "@/app/ui/utilities";
import QualityBadges from "@/app/ui/badges/QualityBadges";
import FeatureTags from "@/app/ui/badges/FeatureTags";
import RelevanceScoreBreakdown from "@/app/ui/analytics/RelevanceScoreBreakdown";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";
import PercentileCards from "@/app/ui/analytics/PercentileCards";
import TooltipIcon from "@/app/ui/icons/TooltipIcon";
import { compareToBaseline, formatComparisonLabel } from "@/app/lib/comparisonUtils";
import {
  ClockIcon,
  CalendarDaysIcon,
  BuildingOffice2Icon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel-nested rounded-lg p-2 text-center">
      <div className="text-lg font-semibold text-base-content">{value}</div>
      <div className="text-xs text-base-content/60">{label}</div>
    </div>
  );
}

function TimelineRow({
  icon: Icon,
  label,
  color = 'text-base-content/70',
  context,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  color?: string;
  context?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={`w-4 h-4 shrink-0 ${color}`} />
      <span className={color}>{label}</span>
      {context && <span className="text-base-content/50 text-xs">{context}</span>}
    </div>
  );
}

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

    let domColor = 'text-base-content/70';
    let contextHint = '';
    if (neighborhoodContext?.median_days_on_market != null && neighborhoodContext.median_days_on_market > 0) {
      const median = Math.round(neighborhoodContext.median_days_on_market);
      const label = formatComparisonLabel(listingDetails.bedrooms, listingDetails.neighborhood, FormatDisplayText);
      contextHint = `${label}: ${median}d`;
      const comparison = compareToBaseline(dom, median);
      if (comparison) {
        domColor = comparison.colorClass;
      }
    }

    items.push(
      <TimelineRow
        key="dom"
        icon={ClockIcon}
        label={domText}
        color={domColor}
        context={contextHint}
      />
    );
  }

  // Available from
  if (listingDetails.available_from) {
    const availDate = new Date(listingDetails.available_from);
    const now = new Date();
    const label = availDate <= now
      ? 'Available now'
      : `Available ${availDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    items.push(
      <TimelineRow key="avail" icon={CalendarDaysIcon} label={label} />
    );
  }

  // Built in / building age
  if (listingDetails.built_in != null && listingDetails.built_in > 0) {
    const age = new Date().getFullYear() - listingDetails.built_in;
    const isPreWar = listingDetails.built_in < 1940;
    const label = `Built ${listingDetails.built_in}${isPreWar ? ' (Pre-war)' : ` (${age}y old)`}`;
    items.push(
      <TimelineRow key="built" icon={BuildingOffice2Icon} label={label} />
    );
  }

  // Market velocity
  if (neighborhoodContext?.median_days_to_rent != null && neighborhoodContext.median_days_to_rent > 0) {
    const medianDaysToRent = Math.round(neighborhoodContext.median_days_to_rent);
    const bedroomLabel = listingDetails.bedrooms === 0 ? 'studios' : `${listingDetails.bedrooms}BRs`;

    // Color-code based on how this listing's DOM compares to typical rent time
    let velocityColor = 'text-base-content/70';
    if (listingDetails.days_on_market != null) {
      const velocityComparison = compareToBaseline(listingDetails.days_on_market, medianDaysToRent);
      if (velocityComparison) {
        velocityColor = velocityComparison.colorClass;
      }
    }

    items.push(
      <TimelineRow
        key="velocity"
        icon={ArrowTrendingUpIcon}
        label={`Similar ${bedroomLabel} rent within ~${medianDaysToRent}d`}
        color={velocityColor}
      />
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="glass-panel-nested rounded-lg p-3 space-y-2">
      {items}
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
  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  const hasSqft = listingDetails.sqft != null && listingDetails.sqft > 0;
  const pricePerSqft = hasSqft
    ? `$${(listingDetails.price / listingDetails.sqft!).toFixed(0)}`
    : '-';

  return (
    <div className="flex flex-col items-start gap-1">
      {/* Address */}
      <h1 className="text-3xl font-semibold text-base-content mb-1">
        {listingDetails.address}
      </h1>

      {/* Subtitle + deal badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm text-base-content">
          {FormatDisplayText(listingDetails.property_type || '')} in {FormatDisplayText(listingDetails.neighborhood)},{" "}
          {FormatDisplayText(listingDetails.borough)} &mdash; {listingDetails.zipcode}
        </p>
        <QualityBadges tags={listingDetails.tag_list || []} mode="inline" dimension="deal" />
      </div>

      {/* Feature tags (popularity, etc.) */}
      <div className="flex flex-wrap gap-1 mt-1">
        <FeatureTags category="Popularity" tags={listingDetails.tag_list || []} />
      </div>

      {/* Specs Grid */}
      <div className="grid grid-cols-4 gap-2 w-full mt-4">
        <SpecItem
          label={listingDetails.bedrooms === 1 ? 'Bed' : 'Beds'}
          value={String(listingDetails.bedrooms ?? '-')}
        />
        <SpecItem
          label={listingDetails.bathrooms === 1 ? 'Bath' : 'Baths'}
          value={String(listingDetails.bathrooms ?? '-')}
        />
        <SpecItem
          label="Sq Ft"
          value={hasSqft ? listingDetails.sqft!.toLocaleString() : '-'}
        />
        <SpecItem
          label="$/Sq Ft"
          value={pricePerSqft}
        />
      </div>

      {/* Listing Timeline */}
      <div className="w-full mt-4">
        <h3 className="text-xs uppercase tracking-wide text-base-content/60 mb-2">Listing Timeline</h3>
        <ListingTimeline listingDetails={listingDetails} neighborhoodContext={neighborhoodContext} />
      </div>

      {/* Expand for Property Insights + Relevance Score */}
      <div className="mt-2">
        <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} expandedText="Hide Property Insights" collapsedText="Show Property Insights" />
      </div>
      <div
        className={`transition-all duration-300 ease-in-out w-full ${
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

        {/* Relevance Score Breakdown */}
        {listingDetails.relevance_score != null && (
          <div className="mt-4">
            <div className="flex flex-row items-center gap-2 mb-2">
              <h3 className="text-xs uppercase tracking-wide text-base-content/60">Relevance Score</h3>
              <TooltipIcon tooltipText="Composite quality score (0–5.5) combining price competitiveness, size, amenities, subway access, and location. Higher is better." />
            </div>
            <RelevanceScoreBreakdown listingDetails={listingDetails} />
          </div>
        )}
      </div>
    </div>
  );
}
