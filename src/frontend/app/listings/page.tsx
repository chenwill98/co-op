import {
  fetchPropertiesRDS
} from "@/app/lib/data";
import { Property } from "@/app/lib/definitions";
import ListingFilters from "@/app/ui/filters/ListingFilters";
import ListingsGrid from "@/app/ui/listings/SearchListingsGrid";
import ChatBox from "@/app/ui/ChatBox";

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

  let queryRecord: Record<string, any> = {};
  let listings: Property[] = [];

  // const listings: Property[] = await fetchPropertiesRDS(params);
  [listings, queryRecord] = await fetchPropertiesRDS(params);
  console.log('queryRecord', queryRecord);

  return (
    <> {/* Ensures ChatBox can be a sibling to main */}
      <main className="z-0">
        <div className="container mx-auto w-5/7">
          <div className="flex flex-row w-full">
            {/* <div className="min-w-72 max-w-72 z-10">
              <ListingFilters />
            </div> */}
            {/* Removed 'relative', kept 'pb-24' for scroll clearance */}
            <div className="grow pb-24">
              <ListingsGrid
                listings={listings}
              />
              {/* ChatBox moved out */}
            </div>
          </div>
        </div>
      </main>
      <ChatBox queryRecord={queryRecord}/> {/* ChatBox is now fixed relative to the viewport */}
    </>
  );
}
