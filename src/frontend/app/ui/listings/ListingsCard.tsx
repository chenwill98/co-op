import { Property } from "@/app/lib/definitions";
import Link from "next/link";
import Image from 'next/image';
import { FormatDisplayText, TagList } from "@/app/ui/utilities";
import BookmarkIcon from "@/app/ui/icons/BookmarkIcon";
import MapButton from "@/app/ui/icons/MapButton";

import { useState } from "react";

interface ListingsCardProps {
  listing: Property;
  animationIndex?: number;
}

export default function ListingsCard({ listing, animationIndex }: ListingsCardProps) {
  const [showMap, setShowMap] = useState(false);

  // Calculate animation delay (50ms increments, capped at 400ms)
  const animationDelay = animationIndex !== undefined
    ? Math.min(animationIndex * 50, 400)
    : 0;

  return (
    <Link
        href={`/listings/${listing.id}`}
        key={listing.id}
        className={`group card rounded-2xl border border-base-300/50 bg-base-100/90 h-[60vh] hover:bg-base-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] transform transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 ${animationIndex !== undefined ? 'animate-fade-up-fast' : ''}`}
        style={animationIndex !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      <figure className="h-3/7 relative bg-primary/10 overflow-hidden">
        <div className="overflow-hidden rounded relative w-full h-full">
          {/* Map: always show for cards without a thumbnail, lazy-load for cards with a thumbnail */}
          {(!listing.thumbnail_image || showMap) && (
            <div
              className="pointer-events-none absolute top-0 left-0 w-full h-full transition-opacity duration-500 opacity-100"
              style={{ zIndex: 1 }}
            >
              <Image
                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+f74e4e(${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'})/${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'},14/600x600@2x?access_token=pk.eyJ1IjoiY2hlbndpbGw5OCIsImEiOiJjbTc4M2JiOWkxZWZtMmtweGRyMHRxenZnIn0.RmSgCA0jq_ejQqDHEUj5Pg`}
                alt={`Map location for ${listing.address}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                className="thumbnail object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}
          {/* Only render the thumbnail if it exists, on top of the map */}
          {listing.thumbnail_image && (
            <div
              className={`pointer-events-none absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${showMap ? 'opacity-0' : 'opacity-100'}`}
              style={{ zIndex: 2 }}
            >
              <Image
                src={listing.thumbnail_image}
                alt={listing.address}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                className="thumbnail object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}
        </div>
        {/* Overlay the MapButton in the bottom left corner */}
        <div className="absolute left-2 bottom-2 z-10">
          <BookmarkIcon property={listing} onClick={(e) => {
            e.preventDefault();    // Stop the <a> navigation
            e.stopPropagation();   // Stop event from bubbling up to the link
          }}/>
        </div>
        {listing.thumbnail_image && (
          <div className="absolute right-2 bottom-2 z-10">
            <MapButton
              showingMap={showMap}
              onToggleMap={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMap((v) => !v);
              }}
            />
          </div>
        )}
      </figure>
      <div className="card-body h-4/7 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0">
            <p className="text-base-content/60 text-xs">
              Rental unit in {FormatDisplayText(listing.neighborhood)}
            </p>
            <h2 className="hover:text-primary transition-colors">{listing.address}</h2>
            <div className="text-base-content/60 text-xs space-x-1">
                <span>
                {listing.bedrooms}{" "}
                {listing.bedrooms === 1 ? "bed" : "beds"}
                </span>
                <span>•</span>
                <span>
                {listing.bathrooms}{" "}
                {listing.bathrooms && listing.bathrooms % 1 === 0 ? (listing.bathrooms === 1 ? "bath" : "baths") : "baths"}
                </span>
                <span>•</span>
                <span>
                {listing.sqft === null ? "N/A" : listing.sqft === 0 ? "-" : listing.sqft} ft
                <sup>2</sup>
                </span>
            </div>
            </div>
            {/* <div className="flex items-center space-x-1">
            <MapButton listing={listing} onClick={(e) => {
                e.preventDefault();    // Stop the <a> navigation
                e.stopPropagation();   // Stop event from bubbling up to the link
            }}/>
            <BookmarkIcon property={listing} onClick={(e) => {
                e.preventDefault();    // Stop the <a> navigation
                e.stopPropagation();   // Stop event from bubbling up to the link
                // Toggle bookmark logic here
            }}/>
            </div> */}
        </div>
        <div className="flex flex-col gap-0">
            <div className="flex flex-row items-center gap-2">
            <div className="text-2xl font-bold">
                ${listing.price.toLocaleString()}
            </div>
            <div className="badge glass-badge-primary text-primary rounded-full text-xs">
                {listing.no_fee
                ? "No Fee"
                : `Fees: ~$${Math.floor(listing.price * (listing.brokers_fee || 0)).toLocaleString()}`}
            </div>
            </div>
            {!listing.no_fee && (
            <div>
                <span className="text-base-content text-lg font-semibold">${(listing.price + listing.price * (listing.brokers_fee || 0)).toLocaleString()}</span>
                <span className="text-base-content/60 text-xs">
                {" "}
                net effective rent
                </span>
            </div>
            )}
        </div>
        <div className="flex flex-col mt-auto gap-2">
            <TagList tags={listing.tag_list || []} />
            <div className="text-base-content/60 text-xs">Listing on StreetEasy</div>
        </div>
        </div>
    </Link>
  );
}
