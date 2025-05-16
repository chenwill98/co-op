"use client";

import { Property } from "@/app/lib/definitions";
import { useSearchParams } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";

// Sort options 
type SortOption = "original" | "newest" | "price-low" | "price-high";

interface SortConfig {
  label: string;
  sortFn: (a: Property, b: Property) => number;
}

export default function SavedListingsSummaryCard({
  listings,
}: {
  listings: Property[];
}) {
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") || "";
  const [sortOption, setSortOption] = useState<SortOption>("original");
  const [sortedListings, setSortedListings] = useState<Property[]>(listings);
  
  // Sort configurations
  const sortConfigs: Record<SortOption, SortConfig> = {
    original: {
      label: "Order Saved",
      sortFn: () => 0 // No sorting
    },
    newest: {
      label: "Newest",
      sortFn: (a, b) => new Date(b.listed_at).getTime() - new Date(a.listed_at).getTime()
    },
    "price-low": {
      label: "Least Expensive",
      sortFn: (a, b) => a.price - b.price
    },
    "price-high": {
      label: "Most Expensive",
      sortFn: (a, b) => b.price - a.price
    }
  };
  
  // Apply sorting whenever the sort option or listings change
  useEffect(() => {
    if (sortOption === "original") {
      setSortedListings([...listings]);
    } else {
      const sorted = [...listings].sort(sortConfigs[sortOption].sortFn);
      setSortedListings(sorted);
    }
  }, [listings, sortOption]);
  
  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
  };
  
  // For backwards compatibility with URL params
  const getSortText = () => {
    switch (sort) {
      case "newest":
        return "Sorted by newest first";
      case "least_expensive":
        return "Sorted by price: Low to High";
      case "most_expensive":
        return "Sorted by price: High to Low";
      default:
        return sortOption !== "original" ? 
          `Sorted by ${sortConfigs[sortOption].label.toLowerCase()}` : 
          "Shown in the order you saved them";
    }
  };

  // Pass sorted listings to parent component
  useEffect(() => {
    // Emit event with sorted listings that can be caught by parent component
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('listings-sorted', { 
        detail: { listings: sortedListings } 
      });
      window.dispatchEvent(event);
    }
  }, [sortedListings]);

  return (
    <div className="card border border-base-content/10 bg-base-100 shadow-xl col-span-3 p-6 rounded">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              {listings.length}{" "}
              {listings.length === 1 ? "Property" : "Properties"} Saved 🎉
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
      {/* Client side filters */}
      <div className="flex flex-row mt-4">
        <div className="dropdown dropdown-start">
          <div tabIndex={0} role="button" className="btn btn-primary rounded-full">
            {sortConfigs[sortOption].label}
            <ChevronDownIcon className="w-4 h-4 ml-1" />
          </div>
          <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[100] w-52 p-2 shadow-md">
            {Object.entries(sortConfigs).map(([key, config]) => (
              <li key={key} className={sortOption === key ? "bg-primary/10 rounded-lg" : ""}>
                <a onClick={() => handleSortChange(key as SortOption)}>
                  {config.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
