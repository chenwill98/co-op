// /app/listings/[id]/page.tsx
import { fetchPropertyPage } from "@/app/lib/data";
import BookmarkIcon from "@/app/ui/icons/BookmarkIcon";
import Link from "next/link";
import ImageCarousel from "@/app/ui/listingspage/ImageCarousel";

interface PropertyPageProps {
  params: { id: string };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  // Fetch the combined property details (property, details, tags, etc.)
  const listingDetails = await fetchPropertyPage(params.id);
  console.log(listingDetails);

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
          <ul className="flex">
            <li>
              <Link
                href={`/listings?borough=${listingDetails.borough}`}
                className="text-blue-500 hover:underline"
              >
                {listingDetails.borough}
              </Link>
            </li>
            <li>
              <Link
                href={`/listings?borough=${listingDetails.borough}&neighborhood=${listingDetails.neighborhood}`}
                className="text-blue-500 hover:underline"
              >
                {listingDetails.neighborhood}
              </Link>
            </li>
            <li>{listingDetails.address}</li>
          </ul>
        </nav>

        <BookmarkIcon />
      </div>

      {/* Two-Column Layout for Property Details */}
      <div className="grid grid-cols-2 gap-8">
        {/* Carousel Section */}
        <div className="flex flex-col">
          <ImageCarousel mediaItems={mediaItems} />
          {/* Description Section */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Description Summary ✨
            </h2>
            <p className="mt-2 text-gray-700 leading-relaxed">
              {listingDetails.description}
            </p>
          </div>
        </div>
        {/* Right Column: Main Property Details */}
        <div className="flex flex-col">
          <div className="flex flex-col items-start">
            <h1 className="text-3xl font-bold text-gray-800">
              {listingDetails.address}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {listingDetails.property_type} in {listingDetails.neighborhood},{" "}
              {listingDetails.borough} &mdash; {listingDetails.zipcode}
            </p>
            <div className="text-gray-500 text-sm space-x-1">
              <span>
                {listingDetails.bedrooms}{" "}
                {listingDetails.bedrooms === 1 ? "bed" : "beds"}
              </span>
              <span>|</span>
              <span>
                {listingDetails.bathrooms}{" "}
                {listingDetails.bathrooms === 1 ? "bath" : "baths"}
              </span>
              <span>|</span>
              <span>
                {listingDetails.sqft === null ? "N/A" : listingDetails.sqft} ft
                <sup>2</sup>
              </span>
              <span>|</span>
              <span>
                $
                {listingDetails.sqft === null
                  ? "N/A"
                  : (listingDetails.price / listingDetails.sqft).toFixed(
                      2,
                    )}{" "}
                per ft<sup>2</sup>
              </span>
            </div>
          </div>

          {/* Price and Basic Stats */}
          <div className="">
            <div>
              <p className="text-2xl font-semibold text-gray-800">
                ${listingDetails.price.toLocaleString()}
              </p>
              {!listingDetails.no_fee && (
                <p className="mt-1 text-lg text-gray-700">
                  Net effective rent: $
                  {(
                    listingDetails.price -
                    listingDetails.price * 0.15
                  ).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Additional sections (Property Details, Amenities, Agents, Tags, etc.) can follow here */}
        </div>
      </div>
    </div>
  );
}
