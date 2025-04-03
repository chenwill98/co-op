import {
  fetchPropertiesRDS
} from "@/app/lib/data";
import { Property } from "@/app/lib/definitions";
import ListingFilters from "@/app/ui/filters/ListingFilters";
import ListingsGrid from "@/app/ui/listings/SearchListingsGrid";

function getParam(value: string | string[] | undefined, defaultValue = ""): string {
  if (!value) return defaultValue;
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: { searchParams: any }) {
  // Await searchParams if it's a promise
  const resolvedSearchParams = await searchParams;

  // Extract query parameters
  const params = {
    text: getParam(resolvedSearchParams.text),
    neighborhood: getParam(resolvedSearchParams.neighborhood),
    minPrice: getParam(resolvedSearchParams.minPrice),
    maxPrice: getParam(resolvedSearchParams.maxPrice),
    brokerFee: getParam(resolvedSearchParams.brokerFee, "Any"),
    sort: getParam(resolvedSearchParams.sort),
    tags: getParam(resolvedSearchParams.tags),
  };

  // const listings: Property[] = await fetchPropertiesRDS(params);
  const listings: Property[] = await Promise.all([fetchPropertiesRDS(params)]).then(results => results[0]);

  return (
    <main className="z-0 bg-base-200">
      <div className="flex flex-row w-full">
        <div className="min-w-72 max-w-72 z-10">
          <ListingFilters />
        </div>
        <div className="grow">
          <ListingsGrid
            listings={listings}
          />
        </div>
      </div>
    </main>
  );
}
