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
    <main className="z-0 min-h-screen">
      <div className="container mx-auto w-full px-4 md:w-5/6 lg:w-5/7 flex flex-col min-h-[calc(100vh-4rem)]">
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
            <div className="flex flex-col items-center justify-center glass-card rounded-2xl p-10 animate-fade-up-fast max-w-md">
              <div className="w-20 h-20 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-base-content mb-2">No saved listings yet</h2>
              <p className="text-center text-base-content/60 mb-6">
                Bookmark properties you like by clicking the heart icon, and they&apos;ll appear here for easy access.
              </p>
              <Link href="/listings" className="btn btn-lg btn-primary">
                Browse Listings
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}