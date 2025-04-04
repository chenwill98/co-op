"use client";

import { Property } from "@/app/lib/definitions";
import ListingsCard from "./ListingsCard";
import SavedListingsSummaryCard from "./SavedListingsSummaryCard";

export default function ListingsGrid({
  listings,
}: {
  listings: Property[];
}) {
  // No need for client-side filtering anymore as it's done on the server
  return (
    <div className="grid grid-cols-3 gap-3 p-4 w-full">
      <SavedListingsSummaryCard listings={listings} />
      {listings.map((listing) => (
        <ListingsCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
