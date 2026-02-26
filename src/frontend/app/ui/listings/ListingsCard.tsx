import { Property } from "@/app/lib/definitions";
import Link from "next/link";
import Image from 'next/image';
import { netEffectivePrice } from "@/app/lib/searchUtils";
import { FormatDisplayText, TagList } from "@/app/ui/utilities";
import BookmarkIcon from "@/app/ui/icons/BookmarkIcon";
import MapButton from "@/app/ui/icons/MapButton";

import { useState } from "react";

interface ListingsCardProps {
  listing: Property;
  animationIndex?: number;
  hideBookmark?: boolean;
}

export default function ListingsCard({ listing, animationIndex, hideBookmark }: ListingsCardProps) {
  const [showMap, setShowMap] = useState(false);
  const mapboxToken = process.env.MAPBOX_TOKEN;
  const staticMapUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+f74e4e(${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'})/${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'},14/600x600@2x?access_token=${mapboxToken}`
    : null;

  // Calculate animation delay (50ms increments, capped at 400ms)
  const animationDelay = animationIndex !== undefined
    ? Math.min(animationIndex * 50, 400)
    : 0;

  return (
    <Link
        href={`/listings/${listing.id}`}
        key={listing.id}
        className={`group card rounded-2xl border border-base-300/50 bg-base-100/80 backdrop-blur-lg shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_12px_40px_rgba(0,0,0,0.12)] transform transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 snap-start scroll-mt-20 ${animationIndex !== undefined ? 'animate-fade-up-fast' : ''}`}
        style={animationIndex !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      <figure className="aspect-[3/2] relative bg-primary/10 overflow-hidden">
        <div className="overflow-hidden rounded relative w-full h-full">
          {/* Map: always show for cards without a thumbnail, lazy-load for cards with a thumbnail */}
          {(!listing.thumbnail_image || showMap) && staticMapUrl && (
            <div
              className="pointer-events-none absolute top-0 left-0 w-full h-full transition-opacity duration-500 opacity-100"
              style={{ zIndex: 1 }}
            >
              <Image
                src={staticMapUrl}
                alt={`Map location for ${listing.address}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 30vw"
                className="thumbnail object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}
          {!listing.thumbnail_image && !staticMapUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-base-content/60">
              Map unavailable
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
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 30vw"
                className="thumbnail object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}
        </div>
        {/* Overlay the BookmarkIcon in the bottom left corner */}
        {!hideBookmark && (
          <div className="absolute left-2 bottom-2 z-10">
            <BookmarkIcon property={listing} onClick={(e) => {
              e.preventDefault();    // Stop the <a> navigation
              e.stopPropagation();   // Stop event from bubbling up to the link
            }}/>
          </div>
        )}
        {listing.thumbnail_image && staticMapUrl && (
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
      <div className="card-body flex flex-col p-3 gap-1">
        {/* Tags — single line, compact */}
        <TagList tags={listing.tag_list || []} compact />

        {/* Price — net effective (base + monthly broker fee) */}
        <div className="flex flex-row items-baseline gap-2">
          <div className="text-2xl font-bold">
            ${netEffectivePrice(listing).toLocaleString()}
          </div>
          {!listing.no_fee ? (
            <span className="text-xs text-base-content/50">net effective</span>
          ) : (
            <div className="badge glass-badge-primary text-primary rounded-full text-[0.7rem] py-0.5 h-auto min-h-0 px-2 relative top-[-2px]">
              No Fee
            </div>
          )}
        </div>

        {/* Dimensions + Address — anchored to bottom */}
        <div className="flex flex-col mt-auto gap-0.5">
          <div className="text-base-content/60 text-[0.85rem] space-x-1">
            <span>
              <span className="font-semibold text-base-content">{listing.bedrooms}</span>{" "}
              {listing.bedrooms === 1 ? "bed" : "beds"}
            </span>
            <span>•</span>
            <span>
              <span className="font-semibold text-base-content">{listing.bathrooms}</span>{" "}
              {listing.bathrooms && listing.bathrooms % 1 === 0 ? (listing.bathrooms === 1 ? "bath" : "baths") : "baths"}
            </span>
            <span>•</span>
            <span>
              <span className="font-semibold text-base-content">{listing.sqft === null ? "N/A" : listing.sqft === 0 ? "-" : listing.sqft}</span> ft
              <sup>2</sup>
            </span>
          </div>
          <h2 className="hover:text-primary transition-colors truncate" title={listing.address}>{listing.address}</h2>
          <p className="text-base-content/60 text-xs">
            Rental unit in {FormatDisplayText(listing.neighborhood)}
          </p>
        </div>
      </div>
    </Link>
  );
}
