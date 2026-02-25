'use client';

import { CombinedPropertyDetails, AdditionalFee, NeighborhoodContext } from "@/app/lib/definitions";
import { TagList, FormatDisplayText } from "@/app/ui/utilities";
import { useState, useMemo, useRef } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";
import PercentileCards from "@/app/ui/analytics/PercentileCards";
import TooltipIcon from "@/app/ui/icons/TooltipIcon";
import PriceHistoryChart from "@/app/ui/listingspage/PriceHistoryChart";

function parseAdditionalFees(raw: unknown): AdditionalFee[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f: unknown): f is AdditionalFee =>
        typeof f === 'object' && f !== null && 'name' in f && 'recurring' in f
    );
  } catch {
    return [];
  }
}

function categorizeFees(fees: AdditionalFee[]) {
  const recurring: AdditionalFee[] = [];
  const oneTime: AdditionalFee[] = [];
  const concessions: AdditionalFee[] = [];

  for (const fee of fees) {
    // Concessions: "months" type (free rent), or negative amounts, or name contains "free" or "concession"
    const isConcession =
      fee.type === 'months' ||
      (fee.amount !== null && fee.amount < 0) ||
      /free|concession|credit/i.test(fee.name);

    if (isConcession) {
      concessions.push(fee);
    } else if (fee.recurring) {
      recurring.push(fee);
    } else {
      oneTime.push(fee);
    }
  }

  return { recurring, oneTime, concessions };
}

function formatFeeName(name: string): string {
  return name
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ListingsPricingPanel({
  listingDetails,
  neighborhoodContext,
}: {
  listingDetails: CombinedPropertyDetails;
  neighborhoodContext?: NeighborhoodContext | null;
}) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const hasExpanded = useRef(false);

  // Track first expansion so PriceHistoryChart stays mounted after initial load
  const handleToggleExpand = () => {
    setIsDetailsExpanded(prev => {
      if (!prev) hasExpanded.current = true;
      return !prev;
    });
  };

  const fees = useMemo(() => parseAdditionalFees(listingDetails.additional_fees), [listingDetails.additional_fees]);
  const { recurring, oneTime, concessions } = useMemo(() => categorizeFees(fees), [fees]);



  // Compute true monthly cost
  const monthlyBreakdown = useMemo(() => {
    let trueMonthly = listingDetails.price;
    const items: { label: string; amount: string; isBase?: boolean }[] = [
      { label: 'Base rent', amount: `$${listingDetails.price.toLocaleString()}`, isBase: true },
    ];

    // Broker fee amortized monthly (over 12 months)
    if (!listingDetails.no_fee && listingDetails.brokers_fee != null && listingDetails.brokers_fee > 0) {
      const brokerFeeAnnual = listingDetails.price * listingDetails.brokers_fee * 12;
      const brokerFeeMonthly = brokerFeeAnnual / 12;
      trueMonthly += brokerFeeMonthly;
      items.push({
        label: `Broker fee (${(listingDetails.brokers_fee * 100).toFixed(0)}%, amortized)`,
        amount: `+$${brokerFeeMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });
    }

    // Recurring dollar fees
    for (const fee of recurring) {
      if (fee.amount !== null && fee.type === 'dollars') {
        trueMonthly += fee.amount;
        items.push({
          label: formatFeeName(fee.name),
          amount: `+$${fee.amount.toLocaleString()}`,
        });
      } else if (fee.amount !== null && fee.type === 'percentage') {
        const feeAmount = listingDetails.price * fee.amount / 100;
        trueMonthly += feeAmount;
        items.push({
          label: `${formatFeeName(fee.name)} (${fee.amount}%)`,
          amount: `+$${feeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        });
      } else if (fee.name) {
        items.push({
          label: formatFeeName(fee.name),
          amount: 'Fee applies',
        });
      }
    }

    return { items, total: trueMonthly };
  }, [listingDetails.price, listingDetails.no_fee, listingDetails.brokers_fee, recurring]);

  // Compute move-in costs
  const moveInBreakdown = useMemo(() => {
    const items: { label: string; amount: string }[] = [
      { label: 'First month rent', amount: `$${listingDetails.price.toLocaleString()}` },
    ];
    let total = listingDetails.price;

    // Broker fee upfront
    if (!listingDetails.no_fee && listingDetails.brokers_fee != null && listingDetails.brokers_fee > 0) {
      const brokerFee = listingDetails.price * listingDetails.brokers_fee * 12;
      total += brokerFee;
      items.push({
        label: `Broker fee (${(listingDetails.brokers_fee * 100).toFixed(0)}% annual)`,
        amount: `$${brokerFee.toLocaleString()}`,
      });
    }

    // Security deposit (standard: 1 month rent)
    total += listingDetails.price;
    items.push({
      label: 'Security deposit',
      amount: `$${listingDetails.price.toLocaleString()}`,
    });

    // One-time fees
    for (const fee of oneTime) {
      if (fee.amount !== null && fee.type === 'dollars') {
        total += fee.amount;
        items.push({
          label: formatFeeName(fee.name),
          amount: `$${fee.amount.toLocaleString()}`,
        });
      } else if (fee.name) {
        items.push({
          label: formatFeeName(fee.name),
          amount: 'Fee applies',
        });
      }
    }

    return { items, total };
  }, [listingDetails.price, listingDetails.no_fee, listingDetails.brokers_fee, oneTime]);

  // Concessions breakdown
  const concessionItems = useMemo(() => {
    const items: { label: string; amount: string }[] = [];
    for (const fee of concessions) {
      if (fee.type === 'months' && fee.amount !== null) {
        const savings = fee.amount * listingDetails.price;
        items.push({
          label: `${fee.amount} month${fee.amount !== 1 ? 's' : ''} free rent`,
          amount: `-$${savings.toLocaleString()}`,
        });
      } else if (fee.amount !== null && fee.type === 'dollars') {
        items.push({
          label: formatFeeName(fee.name),
          amount: `-$${Math.abs(fee.amount).toLocaleString()}`,
        });
      } else if (fee.name) {
        items.push({
          label: formatFeeName(fee.name),
          amount: 'Concession applies',
        });
      }
    }
    return items;
  }, [concessions, listingDetails.price]);

  // Whether there's anything beyond base rent to show
  const hasBreakdown = monthlyBreakdown.items.length > 1 || moveInBreakdown.items.length > 2 || concessionItems.length > 0;

  // Neighborhood median comparison
  const medianComparison = useMemo(() => {
    if (!neighborhoodContext?.median_price) return null;
    const diff = listingDetails.price - neighborhoodContext.median_price;
    const bedroomLabel = listingDetails.bedrooms === 0 ? 'studio' : `${listingDetails.bedrooms}BR`;
    const neighborhood = FormatDisplayText(listingDetails.neighborhood);
    return {
      median: neighborhoodContext.median_price,
      diff,
      label: `Median ${bedroomLabel} in ${neighborhood}`,
    };
  }, [neighborhoodContext, listingDetails.price, listingDetails.bedrooms, listingDetails.neighborhood]);

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-semibold text-base-content mb-1">Price</h2>
      <div className="flex flex-wrap gap-1 mb-2">
        <TagList category="Price" tags={listingDetails.tag_list || []} />
      </div>

      {/* Base price */}
      <div className="text-2xl font-bold mb-1">
        ${listingDetails.price.toLocaleString()}
        <span className="text-base-content/60 text-sm font-normal"> /month</span>
        {listingDetails.no_fee && (
          <span className="badge badge-sm glass-badge-success rounded-full ml-2 align-middle">No Fee</span>
        )}
      </div>

      {/* Neighborhood median comparison */}
      {medianComparison && (
        <div className="text-sm text-base-content/70 mb-2">
          {medianComparison.label}: ${medianComparison.median.toLocaleString()}
          {medianComparison.diff !== 0 && (
            <span className={medianComparison.diff < 0 ? 'text-success ml-1' : 'text-warning ml-1'}>
              {medianComparison.diff < 0
                ? `you save $${Math.abs(medianComparison.diff).toLocaleString()}/mo`
                : `$${medianComparison.diff.toLocaleString()}/mo above median`
              }
            </span>
          )}
        </div>
      )}

      {/* Fee breakdown - only show if there are meaningful fees beyond base rent */}
      {hasBreakdown && (
        <div className="mt-2 space-y-3">
          {/* True Monthly Cost */}
          {monthlyBreakdown.items.length > 1 && (
            <div className="glass-panel-nested rounded-lg p-3">
              <div className="flex flex-row items-center gap-2 mb-2">
                <h3 className="text-xs uppercase tracking-wide text-base-content/60">True Monthly Cost</h3>
                <TooltipIcon tooltipText="Includes base rent plus all recurring fees. Broker fee is amortized over 12 months." />
              </div>
              <div className="space-y-1">
                {monthlyBreakdown.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className={item.isBase ? 'text-base-content' : 'text-base-content/70'}>{item.label}</span>
                    <span className={item.isBase ? 'text-base-content font-medium' : 'text-base-content/70'}>{item.amount}</span>
                  </div>
                ))}
                <div className="border-t border-base-content/10 pt-1 mt-1 flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>${monthlyBreakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                </div>
              </div>
            </div>
          )}

          {/* Move-in Costs */}
          <div className="glass-panel-nested rounded-lg p-3">
            <h3 className="text-xs uppercase tracking-wide text-base-content/60 mb-2">Move-in Costs</h3>
            <div className="space-y-1">
              {moveInBreakdown.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-base-content/70">{item.label}</span>
                  <span className="text-base-content/70">{item.amount}</span>
                </div>
              ))}
              <div className="border-t border-base-content/10 pt-1 mt-1 flex justify-between text-sm font-semibold">
                <span>Total upfront</span>
                <span>${moveInBreakdown.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Concessions */}
          {concessionItems.length > 0 && (
            <div className="glass-panel-nested rounded-lg p-3">
              <h3 className="text-xs uppercase tracking-wide text-base-content/60 mb-2">Concessions</h3>
              <div className="space-y-1">
                {concessionItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-success/80">{item.label}</span>
                    <span className="text-success font-medium">{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simple view when no fee breakdown */}
      {!hasBreakdown && !listingDetails.no_fee && listingDetails.brokers_fee != null && listingDetails.brokers_fee > 0 && (
        <div className="mt-2">
          <div className="glass-panel-nested rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">Net effective rent</span>
              <span className="text-base-content font-medium">
                ${(listingDetails.price + listingDetails.price * listingDetails.brokers_fee).toLocaleString()}/mo
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">Total fees</span>
              <span className="text-base-content font-medium">
                ${(listingDetails.price * listingDetails.brokers_fee * 12).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Details expand (tabbed: Price History + Price Analytics) */}
      <div className="mt-3">
        <ExpandButton
          isExpanded={isDetailsExpanded}
          onToggle={handleToggleExpand}
          collapsedText="Show Pricing Details"
          expandedText="Hide Pricing Details"
        />
      </div>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isDetailsExpanded
            ? 'opacity-100 max-h-[1200px] mt-2 overflow-visible'
            : 'opacity-0 max-h-0 mt-0 overflow-hidden'
        }`}
      >
        <div className="tabs tabs-box justify-center">
          <input
            type="radio"
            name="pricing_tabs"
            className="tab tabs-sm transition-all duration-500 ease-in-out"
            aria-label="Price History"
            defaultChecked
          />
          <div className="tab-content glass-panel-nested m-1 p-3">
            {hasExpanded.current && (
              <PriceHistoryChart propertyId={listingDetails.id} />
            )}
          </div>

          <input
            type="radio"
            name="pricing_tabs"
            className="tab tabs-sm transition-all duration-500 ease-in-out"
            aria-label="Price Analytics"
          />
          <div className="tab-content glass-panel-nested m-1 p-3">
            <div className="flex flex-row items-center gap-2 mb-2">
              <h3 className="text-xs uppercase tracking-wide text-base-content/60">Price Analytics</h3>
              <TooltipIcon tooltipText="Price percentile is a measure of the price of a property relative to other properties with the same number of bedrooms and in the same price band." />
            </div>
            <PercentileCards
              allPercentile={listingDetails.price_percentile ?? null}
              boroughPercentile={listingDetails.price_borough_percentile ?? null}
              neighborhoodPercentile={listingDetails.price_neighborhood_percentile ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
