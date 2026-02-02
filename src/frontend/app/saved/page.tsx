"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Property } from "@/app/lib/definitions";
import SavedListingsGrid from "@/app/ui/listings/SavedListingsGrid";
import { ListingsGridSkeleton } from "@/app/ui/skeletons";

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
    <main className="z-0 bg-base-300 min-h-screen">
      <div className="container mx-auto px-4 w-4/5 flex flex-col min-h-[calc(100vh-4rem)]">
        {isLoading ? (
          <ListingsGridSkeleton />
        ) : savedListings.length > 0 ? (
          <div className="flex flex-row w-full">
            <div className="grow">
              <SavedListingsGrid listings={savedListings} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center glass-card rounded-2xl p-8 animate-fade-up-fast">
              <div className="text-xl text-base-content/60">No saved listings found</div>
              <p className="mt-2 text-base-content/40">
                Bookmark properties you like to see them here
              </p>
              <Link href="/listings" className="btn btn-primary mt-4">
                Browse Listings
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}