"use client";

import { Property } from "@/app/lib/definitions";
import ListingsSummaryCard from "./ListingsSummaryCard";
import ListingsCard from "./ListingsCard";

export default function ListingsGrid({
  listings,
}: {
  listings: Property[];
}) {
  // No need for client-side filtering anymore as it's done on the server
  return (
    <div className="grid grid-cols-3 gap-3 p-4 w-full">
      <ListingsSummaryCard listings={listings} />
      {listings.map((listing) => (
        <ListingsCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
