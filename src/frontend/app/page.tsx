"use client";

import {
  SparklesIcon,
} from "@heroicons/react/24/outline";
import TypingInput from "@/app/ui/search/TypingInput";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useListingsContext } from "@/app/context/ListingsContext";
import AnimatedText from "./components/AnimatedText";
import MapBackground from "./components/MapBackground";

export default function Page() {
  const router = useRouter();

  // Local state for each filter
  const [searchText, setSearchText] = useState("");

  const { setAll } = useListingsContext();

  const handleSearch = async () => {
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: searchText }),
    });
    const { properties, queryRecord, chatHistory } = await res.json();
    setAll(properties, queryRecord, chatHistory);
    router.push("/listings");
  };

  // Handle key press event to check for Enter key
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // Add event listener for Enter key
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [searchText]); // Re-add the listener when searchText changes to ensure we have the latest value

  return (
    <>
      <MapBackground />
      <main
        className="flex h-[calc(100vh-64px)] flex-col items-center justify-center relative z-10"
      >
        <div className="text-6xl font-bold mb-20 text-primary p-6 overflow-hidden
          drop-shadow-sm [text-shadow:_0_2px_8px_rgb(255_255_255_/_40%)]">
          <AnimatedText
            text="AI-powered real estate intelligence."
            charDelay={15}
            startDelay={3000} // 3 second delay before starting the animation
          />
        </div>
        <div
          className="card w-3/5 animate-fade-up-delayed mb-20
            bg-base-100/80 backdrop-blur-lg
            border border-base-300/50
            shadow-[0_8px_32px_rgba(0,0,0,0.08)]
            rounded-[2rem]
            transition-all duration-300
            hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)]
            hover:border-primary/20"
        >
          <div className="card-body py-4 px-6">
            <div className="flex flex-row gap-3 items-center">
              <TypingInput onValueChange={(val) => setSearchText(val)} />
              <button
                className="btn btn-primary text-primary-content text-base
                  rounded-full px-6
                  shadow-md hover:shadow-lg
                  transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleSearch}
              >
                <span>Search</span>
                <SparklesIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
            {/* <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${filtersVisible ? "max-h-40" : "max-h-0"}`}
            >
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2">
                  <label className="label">
                    <span className="label-text text-gray-400">Neighborhood</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brooklyn"
                    className="input w-full"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="label">
                    <span className="label-text text-gray-400">Min Price</span>
                  </label>
                  <input
                    type="number"
                    placeholder="2000"
                    className="input w-full"
                    step="100"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <label className="label">
                    <span className="label-text text-gray-400">Max Price</span>
                  </label>
                  <input
                    type="number"
                    placeholder="5000"
                    className="input w-full"
                    step="100"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text text-gray-400">Broker Fees</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={brokerFee}
                    onChange={(e) => setBrokerFee(e.target.value)}
                  >
                    <option>Any</option>
                    <option>No Fee</option>
                    <option>Low Fee (Less than 10%)</option>
                  </select>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </main>
    </>
  );
}
