"use client";

import { useEffect, useState } from "react";
import { Property } from "@/app/lib/definitions";
import SavedListingsGrid from "@/app/ui/listings/SavedListingsGrid";

export default function SavedListingsPage() {
  const [savedListings, setSavedListings] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved listings from localStorage
  useEffect(() => {
    const loadSavedListings = () => {
      try {
        const savedListingsJson = localStorage.getItem('saved_listings');
        const listings = savedListingsJson ? JSON.parse(savedListingsJson) : [];
        setSavedListings(listings);
      } catch (error) {
        console.error('Error loading saved listings:', error);
        setSavedListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedListings();
  }, []);

  return (
    <main className="z-0 bg-base-200 min-h-screen">
      <div className="container mx-auto py-6 px-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : savedListings.length > 0 ? (
          <div className="flex flex-row w-full">
            <div className="grow">
              <SavedListingsGrid listings={savedListings} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-base-100 rounded-xl shadow-md">
            <div className="text-xl text-gray-500">No saved listings found</div>
            <p className="mt-2 text-gray-400">
              Bookmark properties you like to see them here
            </p>
            <a href="/listings" className="btn btn-primary mt-4">
              Browse Listings
            </a>
          </div>
        )}
      </div>
    </main>
  );
}