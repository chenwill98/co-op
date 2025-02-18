import {
  fetchProperties,
  fetchPropertyDetailsById,
  fetchPropertyTagsById,
} from "@/app/lib/data";
import { Property } from "@/app/lib/definitions";
import ListingsContainer from "@/app/ui/listings/ListingsContainer";

export default async function Page({ searchParams }: { searchParams: any }) {
  // Await searchParams if it's a promise
  const resolvedSearchParams = await searchParams;

  // Extract query parameters
  const params = {
    text: Array.isArray(resolvedSearchParams.text)
      ? resolvedSearchParams.text[0]
      : resolvedSearchParams.text || "",
    neighborhood: Array.isArray(resolvedSearchParams.neighborhood)
      ? resolvedSearchParams.neighborhood[0]
      : resolvedSearchParams.neighborhood || "",
    minPrice: Array.isArray(resolvedSearchParams.minPrice)
      ? resolvedSearchParams.minPrice[0]
      : resolvedSearchParams.minPrice || "",
    maxPrice: Array.isArray(resolvedSearchParams.maxPrice)
      ? resolvedSearchParams.maxPrice[0]
      : resolvedSearchParams.maxPrice || "",
    brokerFee: Array.isArray(resolvedSearchParams.brokerFee)
      ? resolvedSearchParams.brokerFee[0]
      : resolvedSearchParams.brokerFee || "Any",
  };

  const listings: Property[] = await fetchProperties(params);
  const listingIds = listings.map((listing) => listing.id);
  const listingDetails = await fetchPropertyDetailsById(listingIds);
  const listingTags = await fetchPropertyTagsById(listingIds);

  return (
    <main className="z-0">
      <ListingsContainer
        listings={listings}
        listingDetails={listingDetails}
        listingTags={listingTags}
      />
    </main>
  );
}
