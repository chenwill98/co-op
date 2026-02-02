"use client";

import { Property } from "@/app/lib/definitions";
import SearchListingsSummaryCard from "./SearchListingsSummaryCard";
import ListingsCard from "./ListingsCard";

export default function ListingsGrid({
  listings,
}: {
  listings: Property[];
}) {
  // No need for client-side filtering anymore as it's done on the server
  return (
    <div className="grid grid-cols-3 gap-3 p-4 w-full">
      <SearchListingsSummaryCard listings={listings} />
      {listings.map((listing, index) => (
        <ListingsCard key={listing.id} listing={listing} animationIndex={index} />
      ))}
    </div>
  );
}
