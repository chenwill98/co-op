"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import TagsFilter from "./TagsFilter";

export default function ListingFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Initialize all filters from URL parameters including tags
  const [filters, setFilters] = useState({
    text: searchParams.get("text") || "",
    neighborhood: searchParams.get("neighborhood") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    brokerFee: searchParams.get("brokerFee") || "Any",
    sort: searchParams.get("sort") || "",
    tags: searchParams.get("tags") ? searchParams.get("tags")!.split(',') : [],
  });
  
  // Update filters when URL parameters change
  useEffect(() => {
    setFilters({
      text: searchParams.get("text") || "",
      neighborhood: searchParams.get("neighborhood") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      brokerFee: searchParams.get("brokerFee") || "Any",
      sort: searchParams.get("sort") || "",
      tags: searchParams.get("tags") ? searchParams.get("tags")!.split(',') : [],
    });
  }, [searchParams]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    
    // Handle all non-array filters
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== 'tags' && value && value !== "Any") {
        params.set(key, value as string);
      }
    });
    
    // Handle tags separately since it's an array
    if (filters.tags.length > 0) {
      params.set('tags', (filters.tags as string[]).join(','));
    }
    
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="card border-primary bg-base-100 shadow-lg sticky top-20 p-6 m-4 h-fit">
      <div className="flex flex-col gap-4">
        {/* Sort Dropdown */}
        <div className="col-span-1">
          <label className="label">
            <span className="label-text text-gray-400">Sort By</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.sort}
            onChange={(e) => handleInputChange("sort", e.target.value)}
          >
            <option value="">No Sort</option>
            <option value="newest">Newest First</option>
            <option value="least_expensive">Least Expensive</option>
            <option value="most_expensive">Most Expensive</option>
          </select>
        </div>

        <div className="col-span-1">
          <label className="label">
            <span className="label-text text-gray-400">Search</span>
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search listings..."
            className="input w-full"
            value={filters.text}
            onChange={(e) => handleInputChange("text", e.target.value)}
          />
        </div>
        {/* Neighborhood */}
        <div className="col-span-1">
          <label className="label">
            <span className="label-text text-gray-400">Neighborhood</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Brooklyn"
            className="input w-full"
            value={filters.neighborhood}
            onChange={(e) => handleInputChange("neighborhood", e.target.value)}
          />
        </div>

        {/* Price Range */}
        <div className="col-span-1">
          <label className="label">
            <span className="label-text text-gray-400">Price Range</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              className="input w-full"
              step="100"
              min="0"
              value={filters.minPrice}
              onChange={(e) => handleInputChange("minPrice", e.target.value)}
            />
            <input
              type="number"
              placeholder="Max"
              className="input w-full"
              step="100"
              min="0"
              value={filters.maxPrice}
              onChange={(e) => handleInputChange("maxPrice", e.target.value)}
            />
          </div>
        </div>

        {/* Broker Fee */}
        <div className="col-span-1">
          <label className="label">
            <span className="label-text text-gray-400">Broker Fee</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={filters.brokerFee}
            onChange={(e) => handleInputChange("brokerFee", e.target.value)}
          >
            <option>Any</option>
            <option>No Fee</option>
            <option>Low Fee (Less than 10%)</option>
          </select>
        </div>

        {/* Tags Filter */}
        <div className="col-span-1">
          <label className="label">
            <span className="label-text text-gray-400">Tags</span>
          </label>
          <TagsFilter
            selectedTags={filters.tags as string[]}
            setSelectedTags={(tags) => handleInputChange("tags", tags)}
          />
        </div>

        {/* Apply Filters Button */}
        <button onClick={applyFilters} className="btn btn-primary">
          Apply Filters
        </button>
      </div>
    </div>
  );
}
