"use client";

import { Property } from "@/app/lib/definitions";
import { HeartIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface SharedListingsSummaryCardProps {
  listings: Property[];
  createdAt: number;
}

export default function SharedListingsSummaryCard({
  listings,
  createdAt,
}: SharedListingsSummaryCardProps) {
  const [saved, setSaved] = useState(false);

  const handleSaveAll = () => {
    try {
      const existing = JSON.parse(
        localStorage.getItem("saved_listings") || "[]"
      ) as Property[];
      const existingIds = new Set(existing.map((l) => l.id));
      const newListings = listings.filter((l) => !existingIds.has(l.id));

      if (newListings.length > 0) {
        localStorage.setItem(
          "saved_listings",
          JSON.stringify([...existing, ...newListings])
        );
        // Update bookmarks counter
        const currentCount = parseInt(
          localStorage.getItem("new-bookmarks-count") || "0",
          10
        );
        localStorage.setItem(
          "new-bookmarks-count",
          (currentCount + newListings.length).toString()
        );
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving listings:", error);
    }
  };

  const sharedDate = new Date(createdAt * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const priceRange = listings.length > 0
    ? `$${Math.min(...listings.map((l) => l.price)).toLocaleString()} – $${Math.max(...listings.map((l) => l.price)).toLocaleString()}`
    : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-transparent pointer-events-none">
      <div className="container mx-auto pointer-events-auto w-full px-4 md:w-2/3 lg:w-3/5 max-w-3xl">
        <div className="flex flex-row">
          <div className="flex-grow p-4">
            <div className="card bg-base-100/80 backdrop-blur-lg rounded-4xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.08)] mx-auto">
              <div className="card-body p-3">
                {/* Summary line */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="font-semibold text-primary">
                    {listings.length} {listings.length === 1 ? "Property" : "Properties"}
                  </span>
                  <span className="text-base-content/40">&middot;</span>
                  <span className="text-base-content/60">Shared on {sharedDate}</span>
                  {priceRange && (
                    <>
                      <span className="text-base-content/40">&middot;</span>
                      <span className="text-base-content/60">{priceRange}</span>
                    </>
                  )}
                </div>
                {/* Divider */}
                <div className="border-t border-base-300/50 mx-1 my-1" />
                {/* Save button — anchored left */}
                <div className="flex justify-start">
                  <button
                    className="btn btn-sm rounded-full glass-badge-primary hover:brightness-[0.82] active:scale-95 transition-all duration-150"
                    onClick={handleSaveAll}
                    disabled={saved}
                  >
                    <HeartIcon className="w-4 h-4" />
                    {saved ? "Saved!" : "Save All to My Favorites"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
