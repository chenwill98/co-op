import {
  fetchPropertiesRDS
} from "@/app/lib/data";
import { Property } from "@/app/lib/definitions";
import ListingsContainer from "@/app/ui/listings/ListingsContainer";

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
  };

  // const listings: Property[] = await fetchProperties(params);
  const listings: Property[] = await fetchPropertiesRDS(params);

  return (
    <main className="z-0">
      <ListingsContainer
        listings={listings}
      />
    </main>
  );
}
