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

  return (
    <div className="card glass-card col-span-1 md:col-span-2 lg:col-span-3 p-6 rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            Shared Collection
          </h2>
          <p className="text-base-content/60">
            {listings.length}{" "}
            {listings.length === 1 ? "property" : "properties"} &middot; Shared
            on {sharedDate}
          </p>
        </div>
        {listings.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right text-base-content/60">
              <p>Price Range:</p>
              <p className="font-semibold text-primary">
                ${Math.min(...listings.map((l) => l.price)).toLocaleString()} - $
                {Math.max(...listings.map((l) => l.price)).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-row mt-4">
        <button
          className="btn btn-primary rounded-full"
          onClick={handleSaveAll}
          disabled={saved}
        >
          <HeartIcon className="w-4 h-4" />
          {saved ? "Saved!" : "Save All to My Favorites"}
        </button>
      </div>
    </div>
  );
}
