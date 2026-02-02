"use client";

import { Property } from "@/app/lib/definitions";
import ListingsCard from "./ListingsCard";
import SavedListingsSummaryCard from "./SavedListingsSummaryCard";
import { useState, useEffect } from "react";

export default function ListingsGrid({
  listings,
}: {
  listings: Property[];
}) {
  // Track the listings order with state
  const [displayedListings, setDisplayedListings] = useState<Property[]>(listings);
  
  // Listen for the custom event from the summary card component
  useEffect(() => {
    const handleListingsSorted = (event: CustomEvent) => {
      if (event.detail?.listings) {
        setDisplayedListings(event.detail.listings);
      }
    };
    
    // TypeScript requires this casting for CustomEvent
    window.addEventListener('listings-sorted', handleListingsSorted as EventListener);
    
    return () => {
      window.removeEventListener('listings-sorted', handleListingsSorted as EventListener);
    };
  }, []);
  
  // Ensure we have the initial listings
  useEffect(() => {
    if (displayedListings.length === 0 && listings.length > 0) {
      setDisplayedListings(listings);
    }
  }, [listings, displayedListings.length]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 w-full">
      <SavedListingsSummaryCard listings={listings} />
      {displayedListings.map((listing, index) => (
        <ListingsCard key={listing.id} listing={listing} animationIndex={index} />
      ))}
    </div>
  );
}
