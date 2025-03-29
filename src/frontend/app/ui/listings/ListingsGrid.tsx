"use client";

import { Property } from "@/app/lib/definitions";
import { TagList } from "@/app/ui/utilities";
import ListingsSummaryCard from "./ListingsSummaryCard";
import Link from "next/link";
import BookmarkIcon from "@/app/ui/icons/BookmarkIcon";
import MapButton from "@/app/ui/icons/MapButton";
import Image from 'next/image';

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
        <Link
          href={`/listings/${listing.id}`}
          key={listing.id}
          className="group card bg-base-100 h-[60vh] hover:bg-base-200 shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-2"
        >
          <figure className="h-2/5 overflow-hidden relative">
          {listing.thumbnail_image ? (
            <Image
              src={listing.thumbnail_image}
              alt={listing.address}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
              className="thumbnail object-cover w-full h-full
                        transform transition-transform duration-300 group-hover:scale-105 z-0 rounded-2xl"
            />
          ) : (
            <Image
              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+f74e4e(${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'})/${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'},14/600x600@2x?access_token=pk.eyJ1IjoiY2hlbndpbGw5OCIsImEiOiJjbTc4M2JiOWkxZWZtMmtweGRyMHRxenZnIn0.RmSgCA0jq_ejQqDHEUj5Pg`}
              alt={`Map location for ${listing.address}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
              className="thumbnail object-cover w-full h-full
                        transform transition-transform duration-300 group-hover:scale-105 z-0 rounded-2xl"
            />
          )}
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
                    {listing.bathrooms && listing.bathrooms % 1 === 0 ? (listing.bathrooms === 1 ? "bath" : "baths") : "baths"}
                  </span>
                  <span>|</span>
                  <span>
                    {listing.sqft === null ? "N/A" : listing.sqft} ft
                    <sup>2</sup>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <MapButton listing={listing} onClick={(e) => {
                  e.preventDefault();    // Stop the <a> navigation
                  e.stopPropagation();   // Stop event from bubbling up to the link
                }}/>
                <BookmarkIcon onClick={(e) => {
                  e.preventDefault();    // Stop the <a> navigation
                  e.stopPropagation();   // Stop event from bubbling up to the link
                  // Toggle bookmark logic here
                }}/>
              </div>
            </div>
            <div className="flex flex-col gap-0 border-t pt-1">
              <div className="flex flex-row items-center gap-2">
                <div className="text-2xl font-bold">
                  ${listing.price.toLocaleString()}
                </div>
                <div className="badge bg-primary/10 text-primary rounded-full text-xs">
                  {listing.no_fee
                    ? "No Fee"
                    : `Fees: ~$${Math.floor(listing.price * 0.15).toLocaleString()}`}
                </div>
              </div>
              {!listing.no_fee && (
                <div className="text-lg font-semibold">
                  ${Math.floor(listing.price - listing.price * 0.15).toLocaleString()}
                  <span className="text-gray-500 text-sm">
                    {" "}
                    net effective rent
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col mt-auto gap-2">
              <TagList tags={listing.tag_list || []} />
              <div className="text-xs text-gray-500">Listing on StreetEasy</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
