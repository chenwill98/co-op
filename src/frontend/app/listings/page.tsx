'use client';

import { useListingsContext } from "@/app/context/ListingsContext";
import ListingsGrid from "@/app/ui/listings/SearchListingsGrid";
import ChatBox from "@/app/ui/ChatBox";

export default function Page() {
  const { listings } = useListingsContext();

  return (
    <>
      <main className="z-0 relative">
        <div className="container mx-auto w-full px-4 md:w-11/12 lg:w-11/12">
          <div className="flex flex-row w-full">
            <div className="grow pb-24">
              <ListingsGrid listings={listings} />
            </div>
          </div>
        </div>
      </main>
      <ChatBox />
    </>
  );
}


