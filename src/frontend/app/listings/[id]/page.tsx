// /app/listings/[id]/page.tsx
import { fetchPropertyPage, fetchNeighborhoodContext } from "@/app/lib/data";
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
import BuildingUnitsPanel from "@/app/ui/listingspage/BuildingUnitsPanel";
import { FormatDisplayText } from "@/app/ui/utilities";

interface PropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  // Fetch the combined property details (property, details, tags, etc.)
  const pageParams = await params;
  const listingDetails = await fetchPropertyPage(pageParams.id);

  // Fetch neighborhood context in parallel (cheap aggregate query)
  const neighborhoodContext = await fetchNeighborhoodContext(
    listingDetails.neighborhood,
    listingDetails.bedrooms ?? 0
  );

  const mapboxToken = process.env.MAPBOX_TOKEN;

  const mapImage = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+f74e4e(${listingDetails.longitude || '-73.935242'},${listingDetails.latitude || '40.730610'})/${listingDetails.longitude || '-73.935242'},${listingDetails.latitude || '40.730610'},14/600x600@2x?access_token=${mapboxToken}`
    : null;

  // Combine images, videos, and floorplans into one array
  const mediaItems = [
    ...(listingDetails.images ?? []).map((url) => ({ type: "image", url })),
    ...(listingDetails.videos ?? []).map((url) => ({ type: "video", url })),
    ...(listingDetails.floorplans ?? []).map((url) => ({ type: "floorplan", url })),
    ...(mapImage ? [{ type: "map", url: mapImage }] : []),
  ] as { type: string; url: string }[];

  return (
    <main className="container mx-auto px-4 py-8 w-full lg:w-4/5">
      {/* Two-Column Layout for Property Details */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Left Column: Carousel, Description, Amenities, Building Units */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="glass-panel p-4 md:p-5">
            {/* Breadcrumbs + Actions */}
            <div className="flex justify-between items-center mb-4">
              <nav className="breadcrumbs" aria-label="breadcrumbs">
                <ul className="flex items-center">
                  <li>
                    <Link
                      href={`/listings?borough=${FormatDisplayText(listingDetails.borough)}`}
                      className="bg-primary/10 text-primary rounded-full text-xs py-1 px-3 hover:bg-primary/20"
                    >
                      {FormatDisplayText(listingDetails.borough)}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/listings?borough=${FormatDisplayText(listingDetails.borough)}&neighborhood=${FormatDisplayText(listingDetails.neighborhood)}`}
                      className="bg-primary/10 text-primary rounded-full text-xs py-1 px-3 hover:bg-primary/20"
                    >
                      {FormatDisplayText(listingDetails.neighborhood)}
                    </Link>
                  </li>
                  <li className="text-primary text-xs">
                      {listingDetails.address}
                  </li>
                </ul>
              </nav>
              <div className="flex flex-row gap-5 items-center">
                <BookmarkIcon property={listingDetails} />
                <a href={listingDetails.url} className="btn rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-0" target="_blank" rel="noopener noreferrer">StreetEasy <LinkIcon className="h-4 w-4 text-primary"/></a>
              </div>
            </div>
            <ImageCarousel mediaItems={mediaItems} />
          </div>
          {/* Description Section */}
          <div className="glass-panel p-4 md:p-5">
            <ListingsDescriptionPanel listingDetails={listingDetails} />
          </div>
          {/* Amenities */}
          <div className="glass-panel p-4 md:p-5">
            <ListingsAmenitiesPanel listingDetails={listingDetails} />
          </div>
          {/* Building Units */}
          {listingDetails.building_id && (
            <div className="glass-panel p-4 md:p-5">
              <BuildingUnitsPanel
                propertyId={listingDetails.id}
                buildingId={listingDetails.building_id}
                currentPrice={listingDetails.price}
                currentSqft={listingDetails.sqft}
              />
            </div>
          )}
        </div>
        {/* Right Column: Details, Pricing, Transportation, Location */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Property Title + Timeline */}
          <div className="glass-panel p-4 md:p-5">
            <ListingsDetailsPanel
              listingDetails={listingDetails}
              neighborhoodContext={neighborhoodContext}
            />
          </div>

          {/* Price, Fee Breakdown, Price History */}
          <div className="glass-panel p-4 md:p-5">
            <ListingsPricingPanel
              listingDetails={listingDetails}
              neighborhoodContext={neighborhoodContext}
            />
          </div>

          {/* Transportation Info */}
          <div className="glass-panel p-4 md:p-5">
            <ListingsTransportationPanel listingDetails={listingDetails} />
          </div>

          {/* Location Info */}
          <div className="glass-panel p-4 md:p-5">
            <ListingsLocationPanel listingDetails={listingDetails} />
          </div>
        </div>
      </div>
    </main>
  );
}
