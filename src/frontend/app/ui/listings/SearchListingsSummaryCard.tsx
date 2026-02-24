"use client";

import { Property } from "@/app/lib/definitions";
import { useRef, useEffect, useState } from "react";
import { useListingsContext } from "@/app/context/ListingsContext";

const emptyMessages = [
  "No listings match your search criteria",
  "No results found for this search",
  "Nothing found - try adjusting your filters",
  "No matching properties available",
];

export default function SearchListingsSummaryCard({
  listings,
}: {
  listings: Property[];
}) {
  const { hasSearched, sort } = useListingsContext();
  const previousCountRef = useRef<number>(listings.length);
  const [isPulsing, setIsPulsing] = useState(false);
  const [emptyMessage] = useState(
    () => emptyMessages[Math.floor(Math.random() * emptyMessages.length)]
  );

  // Trigger pulse animation when count changes
  useEffect(() => {
    if (previousCountRef.current !== listings.length) {
      setIsPulsing(true);
      previousCountRef.current = listings.length;
      const timer = setTimeout(() => setIsPulsing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [listings.length]);

  // Hide entirely until first search completes
  if (!hasSearched) {
    return null;
  }

  const getSortText = () => {
    switch (sort) {
      case "newest":
        return "Sorted by newest first";
      case "least_expensive":
        return "Sorted by price: Low to High";
      case "most_expensive":
        return "Sorted by price: High to Low";
      default:
        return "Showing all properties";
    }
  };

  return (
    <div className="card glass-card col-span-1 md:col-span-2 lg:col-span-3 p-6 rounded-2xl animate-fade-up-fast">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className={`text-2xl font-bold text-primary ${isPulsing ? 'animate-count-pulse' : ''}`}>
              {listings.length === 0
                ? emptyMessage
                : `${listings.length} ${listings.length === 1 ? "Property" : "Properties"} Found`}
            </h2>
            <p className="text-base-content/60">
              {getSortText()}
            </p>
          </div>
        </div>
        {listings.length > 0 && (
          <div className="text-right text-base-content/60">
            <p>Price Range:</p>
            <p className="font-semibold text-primary">
              ${Math.min(...listings.map((l) => l.price)).toLocaleString()} - $
              {Math.max(...listings.map((l) => l.price)).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
