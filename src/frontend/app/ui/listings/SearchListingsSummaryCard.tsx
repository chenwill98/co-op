"use client";

import { Property } from "@/app/lib/definitions";
import { useSearchParams } from "next/navigation";

export default function SearchListingsSummaryCard({
  listings,
}: {
  listings: Property[];
}) {
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") || "";

  const getSortText = () => {
    switch (sort) {
      case "newest":
        return "Sorted by newest first";
      case "least_expensive":
        return "Sorted by price: Low to High";
      case "most_expensive":
        return "Sorted by price: High to Low";
      default:
        return "Showing all properties";
    }
  };

  return (
    <div className="card border-primary bg-base-100 shadow-xl col-span-3 p-6 rounded">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              {listings.length}{" "}
              {listings.length === 1 ? "Property" : "Properties"} Found 🎉
            </h2>
            <p className="text-base-content/60">
              {getSortText()}
            </p>
          </div>
        </div>
        {listings.length > 0 && (
          <div className="text-right text-base-content/60">
            <p>Price Range:</p>
            <p className="font-semibold text-primary">
              ${Math.min(...listings.map((l) => l.price)).toLocaleString()} - $
              {Math.max(...listings.map((l) => l.price)).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
