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
      if (listings.length > 0) window.scrollTo({ top: 0, behavior: "smooth" });
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
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Different listings — exit animation, then swap
    setIsExiting(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        <div
          key={listing.id}
          className="snap-start scroll-mt-20"
          style={index >= 15 ? { contentVisibility: "auto", containIntrinsicSize: "auto 420px" } : undefined}
        >
          <ListingsCard
            listing={listing}
            animationIndex={isExiting || index >= 15 ? undefined : index}
          />
        </div>
      ))}
      {displayedListings.length > 0 && (
        <div className="col-span-full min-h-[70vh]">
          <EndOfListings />
        </div>
      )}
    </div>
  );
}
