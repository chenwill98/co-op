import { Property } from "@/app/lib/definitions";
import Link from "next/link";
import Image from 'next/image';
import { FormatDisplayText, TagList } from "@/app/ui/utilities";
import BookmarkIcon from "@/app/ui/icons/BookmarkIcon";
import MapButton from "@/app/ui/icons/MapButton";

export default function ListingsCard({ listing }: { listing: Property }) {
  return (
    <Link
        href={`/listings/${listing.id}`}
        key={listing.id}
        className="group card rounded bg-base-100 h-[60vh] hover:bg-base-200 shadow-xl hover:shadow-2xl transform transition-all duration-500 hover:-translate-y-2"
    >
        <figure className="h-3/7 relative bg-primary/10 rounded-t overflow-hidden">
        <div className="absolute inset-1 overflow-hidden rounded-xl">
        {listing.thumbnail_image ? (
        <Image
            src={listing.thumbnail_image}
            alt={listing.address}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className="thumbnail object-cover w-full h-full
                    transform transition-transform duration-300 group-hover:scale-105 z-0"
        />
        ) : (
        <Image
            src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+f74e4e(${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'})/${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'},14/600x600@2x?access_token=pk.eyJ1IjoiY2hlbndpbGw5OCIsImEiOiJjbTc4M2JiOWkxZWZtMmtweGRyMHRxenZnIn0.RmSgCA0jq_ejQqDHEUj5Pg`}
            alt={`Map location for ${listing.address}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className="thumbnail object-cover w-full h-full
                    transform transition-transform duration-300 group-hover:scale-105 z-0"
        />
        )}
        </div>
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
            <div className="flex items-center space-x-1">
            <MapButton listing={listing} onClick={(e) => {
                e.preventDefault();    // Stop the <a> navigation
                e.stopPropagation();   // Stop event from bubbling up to the link
            }}/>
            <BookmarkIcon property={listing} onClick={(e) => {
                e.preventDefault();    // Stop the <a> navigation
                e.stopPropagation();   // Stop event from bubbling up to the link
                // Toggle bookmark logic here
            }}/>
            </div>
        </div>
        <div className="flex flex-col gap-0">
            <div className="flex flex-row items-center gap-2">
            <div className="text-2xl font-bold">
                ${listing.price.toLocaleString()}
            </div>
            <div className="badge bg-primary/10 text-primary rounded-full text-xs">
                {listing.no_fee
                ? "No Fee"
                : `Fees: ~$${Math.floor(listing.price * listing.actual_brokers_fee).toLocaleString()}`}
            </div>
            </div>
            {!listing.no_fee && (
            <div>
                <span className="text-base-content text-lg font-semibold">${Math.floor(listing.price + listing.price * listing.actual_brokers_fee).toLocaleString()}</span>
                <span className="text-base-content/60 text-xs">
                {" "}
                net effective rent
                </span>
            </div>
            )}
        </div>
        <div className="flex flex-col mt-auto gap-2">
            <TagList tags={listing.combined_tag_list || []} />
            <div className="text-base-content/60 text-xs">Listing on StreetEasy</div>
        </div>
        </div>
    </Link>
  );
}
