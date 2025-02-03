import { Property, SortOrder } from "@/app/lib/definitions";

export default function ListingsSummaryCard({
  listings,
  sortOrder,
}: {
  listings: Property[];
  sortOrder: SortOrder;
}) {
  return (
    <div className="card-bordered border-primary bg-base-100 shadow-xl col-span-3 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              {listings.length}{" "}
              {listings.length === 1 ? "Property" : "Properties"} Found 🎉
            </h2>
            <p className="text-gray-500">
              {sortOrder === "none"
                ? "Showing all properties"
                : `Sorted by price: ${sortOrder === "asc" ? "Low to High" : "High to Low"}`}
            </p>
          </div>
        </div>
        {listings.length > 0 && (
          <div className="text-right text-gray-500">
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
