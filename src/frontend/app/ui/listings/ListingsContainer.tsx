"use client";

import { Property } from "@/app/lib/definitions";
import { useState } from "react";
import { SortOrder } from "@/app/lib/definitions";
import ListingFilters from "@/app/ui/filters/ListingFilters";
import ListingsGrid from "@/app/ui/listings/ListingsGrid";

export default function ListingsContainer({
  listings,
  listingDetails,
  listingTags,
}: {
  listings: Property[];
  listingDetails: Record<string, any>;
  listingTags: Record<string, any>;
}) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  return (
    <div className="flex flex-row w-full">
      <div className="min-w-72 z-10">
        <ListingFilters
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
        />
      </div>
      <div className="flex-grow">
        <ListingsGrid
          listings={listings}
          listingDetails={listingDetails}
          listingTags={listingTags}
          sortOrder={sortOrder}
          selectedTags={selectedTags}
        />
      </div>
    </div>
  );
}
