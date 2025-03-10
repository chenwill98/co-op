"use client";

import {
  SparklesIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import TypingInput from "@/app/ui/search/TypingInput";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  return (
    <main
      className="flex h-[calc(100vh-64px)] flex-col items-center justify-center bg-base-200 nyc-emoji-bg"
    >
      <div className="text-3xl mb-20 text-primary bg-base-100 p-6 rounded-2xl shadow-xl">AI powered analytics to help you find your next home.</div>
      <div className="card bg-base-100 w-4/5 shadow-xl">
        <div className="card-body">
          <div className="flex flex-row gap-2">
            <button
              className="btn btn-secondary text-white"
              onClick={toggleFilters}
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
            </button>
            <TypingInput onValueChange={(val) => setSearchText(val)} />
            <button
              className="btn btn-primary text-white"
              onClick={handleSearch}
            >
              Search
              <SparklesIcon className="h-4 w-4" />
            </button>
            
          </div>
          <div
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
          </div>
        </div>
      </div>
    </main>
  );
}
