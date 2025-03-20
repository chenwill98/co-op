"use client";

import {
  SparklesIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import TypingInput from "@/app/ui/search/TypingInput";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AnimatedText from "./components/AnimatedText";
import MapBackground from "./components/MapBackground";

export default function Page() {
  const router = useRouter();

  // Local state for each filter
  const [searchText, setSearchText] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [brokerFee, setBrokerFee] = useState("Any");
  const [filtersVisible, setFiltersVisible] = useState(false);

  const handleSearch = () => {
    // Build query params
    const params = new URLSearchParams({
      text: searchText,
      neighborhood,
      minPrice,
      maxPrice,
      brokerFee,
    });

    // Navigate to /listings with those params (redirect)
    router.push(`/listings?${params.toString()}`);
  };

  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
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
        <div className="text-6xl font-extrabold mb-20 text-primary p-6 overflow-hidden">
          <AnimatedText 
            text="AI powered real estate analytics." 
            charDelay={15}
            startDelay={3000} // 3 second delay before starting the animation
          />
        </div>
        <div 
          className="card bg-primary rounded-full w-3/5 shadow-xl animate-fade-up-delayed mb-20"
        >
          <div className="card-body">
            <div className="flex flex-row gap-2">
              {/* <button
                className="btn btn-secondary text-white"
                onClick={toggleFilters}
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
              </button> */}
              <TypingInput onValueChange={(val) => setSearchText(val)} />
              <button
                className="btn btn-primary text-primary-content text-lg"
                onClick={handleSearch}
              >
                Search
                <SparklesIcon className="h-4 w-4" />
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
