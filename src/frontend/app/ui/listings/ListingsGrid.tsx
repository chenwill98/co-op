import { Property } from "@/app/lib/definitions";
import { useMemo } from "react";
import { SortOrder } from "@/app/lib/definitions";
import ListingsSummaryCard from "./ListingsSummaryCard";
import { HomeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import BookmarkIcon from "@/app/ui/icons/BookmarkIcon";

export default function ListingsGrid({
  listings,
  sortOrder,
  selectedTags,
}: {
  listings: Property[];
  sortOrder: SortOrder;
  selectedTags: string[];
}) {
  const filteredListings = useMemo(() => {
    if (selectedTags.length === 0) return listings;

    return listings.filter((property) => {
      const tags = property.tag_list || [];
      return selectedTags.every((tag) => tags.includes(tag));
    });
  }, [listings, selectedTags]);

  const sortedListings = useMemo(() => {
    if (!sortOrder || sortOrder === "none") return filteredListings;
    return [...filteredListings].sort((a, b) => {
      if (sortOrder === "asc") {
        return a.price - b.price;
      } else {
        return b.price - a.price;
      }
    });
  }, [filteredListings, sortOrder]);


  return (
    <div className="grid grid-cols-3 gap-3 p-4 w-full">
      <ListingsSummaryCard listings={sortedListings} sortOrder={sortOrder} />
      {sortedListings.map((listing: Property) => (
        <Link
          href={`/listings/${listing.id}`}
          key={listing.id}
          className="group card-bordered border-primary bg-base-100 h-[60vh] hover:bg-base-200 shadow-xl hover:shadow-2xl transform transition-transform duration-300"
        >
          <figure className="h-2/5 overflow-hidden">
          <img
            src={listing.thumbnail_image}
            alt={listing.address}
            className="thumbnail object-cover w-full h-full outline outline-1 outline-primary 
                      transform transition-transform duration-300 group-hover:scale-105 z-0"
          />
          </figure>
          <div className="card-body h-3/5 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0">
                <p className="text-gray-500 text-xs">
                  Rental unit in {listing.neighborhood}
                </p>
                <h2 className="hover:text-primary transition-colors">{listing.address}</h2>
                <div className="text-gray-500 text-sm space-x-1">
                  <span>
                    {listing.bedrooms}{" "}
                    {listing.bedrooms === 1 ? "bed" : "beds"}
                  </span>
                  <span>|</span>
                  <span>
                    {listing.bathrooms}{" "}
                    {listing.bathrooms === 1 ? "bath" : "baths"}
                  </span>
                  <span>|</span>
                  <span>
                    {listing.sqft === null ? "N/A" : listing.sqft} ft
                    <sup>2</sup>
                  </span>
                </div>
              </div>
              <BookmarkIcon onClick={(e) => {
                e.preventDefault();    // Stop the <a> navigation
                e.stopPropagation();   // Stop event from bubbling up to the link
                // Toggle bookmark logic here
              }}/>
            </div>
            <div className="flex flex-col gap-0 border-t pt-1">
              <div className="flex flex-row items-center gap-2">
                <div className="text-2xl font-bold">
                  ${listing.price.toLocaleString()}
                </div>
                <div className="badge bg-primary rounded-full text-white">
                  {listing.no_fee
                    ? "No Fee"
                    : `Fees: ~$${listing.price * 0.15}`}
                </div>
              </div>
              {!listing.no_fee && (
                <div className="text-lg font-semibold">
                  ${(listing.price - listing.price * 0.15).toLocaleString()}
                  <span className="text-gray-500 text-sm">
                    {" "}
                    net effective rent
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col mt-auto gap-2">
              <div className="flex flex-wrap gap-1">
                {(listing.tag_list || []).map((tag: string) => (
                  <div
                    key={tag}
                    className="badge badge-primary rounded-full badge-outline text-xs"
                  >
                    {tag}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500">Listing on StreetEasy</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
