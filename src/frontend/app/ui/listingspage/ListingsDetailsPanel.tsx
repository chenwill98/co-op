import { CombinedPropertyDetails } from "@/app/lib/definitions";

export default function ListingsDetailsPanel({ listingDetails }: { listingDetails: CombinedPropertyDetails }) {
    return (
        <div className="flex flex-col items-start gap-1">
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
    );
}