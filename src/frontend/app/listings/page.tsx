'use client';

import { useListingsContext } from "@/app/context/ListingsContext";
import ListingsGrid from "@/app/ui/listings/SearchListingsGrid";
import ChatBox from "@/app/ui/ChatBox";

export default function Page() {
  const { listings } = useListingsContext();

  return (
    <>
      <main className="z-0 relative">
        <div className="container mx-auto w-5/7">
          <div className="flex flex-row w-full">
            <div className="grow pb-24">
              <ListingsGrid listings={listings} />
            </div>
          </div>
        </div>
        {/* White gradient overlay at the bottom to prevent cards under the ChatBox */}
        <div className="pointer-events-none fixed left-0 bottom-0 w-full h-16 z-20 bg-base-100 [mask-image:linear-gradient(to_top,white_80%,transparent_100%)]" />
      </main>
      <ChatBox />
    </>
  );
}


