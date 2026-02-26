"use client";

import { useState, useEffect, useRef } from "react";
import { Property } from "@/app/lib/definitions";
import ListingsCard from "./ListingsCard";
import EndOfListings from "./EndOfListings";

export default function ListingsGrid({
  listings,
}: {
  listings: Property[];
}) {
  const [displayedListings, setDisplayedListings] = useState<Property[]>(listings);
  const [isExiting, setIsExiting] = useState(false);
  const prevIdsRef = useRef<string>("");

  useEffect(() => {
    const newIds = listings.map(l => l.id).join(",");
    const prevIds = prevIdsRef.current;

    // First load or going from empty — swap immediately, no exit animation
    if (!prevIds || listings.length === 0) {
      setDisplayedListings(listings);
      prevIdsRef.current = newIds;
      return;
    }

    // Same listing IDs (sort change) — swap immediately
    if (newIds === prevIds) {
      setDisplayedListings(listings);
      return;
    }

    // Check if it's just a reorder (same IDs, different order)
    const prevSet = new Set(prevIds.split(","));
    const newSet = new Set(newIds.split(","));
    const isSameSet = prevSet.size === newSet.size && [...newSet].every(id => prevSet.has(id));

    if (isSameSet) {
      setDisplayedListings(listings);
      prevIdsRef.current = newIds;
      return;
    }

    // Different listings — exit animation, then swap
    setIsExiting(true);
    const timer = setTimeout(() => {
      setDisplayedListings(listings);
      setIsExiting(false);
      prevIdsRef.current = newIds;
    }, 250);

    return () => clearTimeout(timer);
  }, [listings]);

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 w-full ${
        isExiting ? "animate-fade-down-out" : ""
      }`}
    >
      {displayedListings.map((listing, index) => (
        <ListingsCard
          key={listing.id}
          listing={listing}
          animationIndex={isExiting ? undefined : index}
        />
      ))}
      {displayedListings.length > 0 && (
        <div className="col-span-full min-h-[70vh]">
          <EndOfListings />
        </div>
      )}
    </div>
  );
}
