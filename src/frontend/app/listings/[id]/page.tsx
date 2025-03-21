// /app/listings/[id]/page.tsx
import { fetchPropertyPage } from "@/app/lib/data";
import BookmarkIcon from "@/app/ui/icons/BookmarkIcon";
import {
  LinkIcon
} from "@heroicons/react/24/solid";
import Link from "next/link";
import ImageCarousel from "@/app/ui/listingspage/ImageCarousel";
import ListingsDetailsPanel from "@/app/ui/listingspage/ListingsDetailsPanel";
import ListingsPricingPanel from "@/app/ui/listingspage/ListingsPricingPanel";
import ListingsAmenitiesPanel from "@/app/ui/listingspage/ListingsAmentitiesPanel";
import ListingsLocationPanel from "@/app/ui/listingspage/ListingsLocationPanel";
import ListingsTransportationPanel from "@/app/ui/listingspage/ListingsTransportationPanel";
import ListingsDescriptionPanel from "@/app/ui/listingspage/ListingsDescriptionPanel";

interface PropertyPageProps {
  params: { id: string };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  // Fetch the combined property details (property, details, tags, etc.)
  const pageParams = await params;
  const listingDetails = await fetchPropertyPage(pageParams.id);
  console.log('Listing details:', listingDetails);

  // Combine images, videos, and floorplans into one array
  const mediaItems = [
    ...listingDetails.images.map((url) => ({ type: "image", url })),
    ...listingDetails.videos.map((url) => ({ type: "video", url })),
    ...listingDetails.floorplans.map((url) => ({ type: "floorplan", url })),
  ] as { type: string; url: string }[];

  return (
    <div className="mx-auto px-4 py-8 w-3/4">
      {/* Breadcrumbs */}
      <div className="flex justify-between">
        <nav className="breadcrumbs" aria-label="breadcrumbs">
          <ul className="flex items-center">
            <li>
              <Link
                href={`/listings?borough=${listingDetails.borough}`}
                className="bg-primary/10 text-primary rounded-full text-xs py-1 px-3 hover:bg-primary/20"
              >
                {listingDetails.borough}
              </Link>
            </li>
            <li>
              <Link
                href={`/listings?borough=${listingDetails.borough}&neighborhood=${listingDetails.neighborhood}`}
                className="bg-primary/10 text-primary rounded-full text-xs py-1 px-3 hover:bg-primary/20"
              >
                {listingDetails.neighborhood}
              </Link>
            </li>
            <li className="text-primary text-xs">
                {listingDetails.address}
            </li>
          </ul>
        </nav>
        <div className="flex flex-row gap-5 items-center">
          <BookmarkIcon />
          <a href={listingDetails.url} className="btn btn-outline btn-primary" target="_blank" rel="noopener noreferrer">StreetEasy <LinkIcon className="h-4 w-4 text-primary"/></a>
        </div>
      </div>

      {/* Two-Column Layout for Property Details */}
      <div className="grid grid-cols-5 gap-20 mt-4">
        {/* Carousel Section */}
        <div className="flex flex-col col-span-3">
          <ImageCarousel mediaItems={mediaItems} />
          {/* Description Section */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <ListingsDescriptionPanel listingDetails={listingDetails} />
          </div>
          {/* Amenities */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <ListingsAmenitiesPanel listingDetails={listingDetails} />
          </div>
        </div>
        {/* Right Column: Main Property Details */}
        <div className="flex flex-col col-span-2">
          {/* Property Title */}
          <ListingsDetailsPanel listingDetails={listingDetails} />

          {/* Price and Basic Stats */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <ListingsPricingPanel listingDetails={listingDetails} />
          </div>

          {/* Transportation Info */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <ListingsTransportationPanel listingDetails={listingDetails} />
          </div>

          {/* Location Info */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <ListingsLocationPanel listingDetails={listingDetails} />
          </div>

        </div>
      </div>
    </div>
  );
}
