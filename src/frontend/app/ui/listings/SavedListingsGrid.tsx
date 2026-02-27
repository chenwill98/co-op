"use client";

import { Property } from "@/app/lib/definitions";
import ListingsCard from "./ListingsCard";
import EndOfListings from "./EndOfListings";
import SavedListingsSummaryCard from "./SavedListingsSummaryCard";
import { useState, useEffect, useCallback, useRef } from "react";

const SHARE_CACHE_KEY = "share-url-cache";

interface ShareCache {
  propertyIds: string[];
  url: string;
  shareId: string;
}

function getShareCache(): ShareCache | null {
  try {
    const raw = localStorage.getItem(SHARE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ShareCache;
  } catch {
    return null;
  }
}

export default function ListingsGrid({
  listings,
}: {
  listings: Property[];
}) {
  // Track the listings order with state
  const [displayedListings, setDisplayedListings] = useState<Property[]>(listings);

  // --- Share session state ---
  const [sessionIds, setSessionIds] = useState<Set<string> | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // PATCH serialization: only one in-flight at a time
  const patchInFlightRef = useRef(false);
  const pendingPatchRef = useRef<string[] | null>(null);

  // Initialize share session state from localStorage
  useEffect(() => {
    const cache = getShareCache();
    if (cache) {
      setShareId(cache.shareId);
      setSessionIds(new Set(cache.propertyIds));
    }
  }, []);

  // Listen for share-created event from SavedListingsSummaryCard
  useEffect(() => {
    const handleShareCreated = (event: CustomEvent<ShareCache>) => {
      const cache = event.detail;
      setShareId(cache.shareId);
      setSessionIds(new Set(cache.propertyIds));
    };

    window.addEventListener("share-created", handleShareCreated as EventListener);
    return () => {
      window.removeEventListener("share-created", handleShareCreated as EventListener);
    };
  }, []);

  // Listen for the custom event from the summary card component (sort)
  useEffect(() => {
    const handleListingsSorted = (event: CustomEvent) => {
      if (event.detail?.listings) {
        setDisplayedListings(event.detail.listings);
      }
    };

    window.addEventListener('listings-sorted', handleListingsSorted as EventListener);
    return () => {
      window.removeEventListener('listings-sorted', handleListingsSorted as EventListener);
    };
  }, []);

  // Ensure we have the initial listings
  useEffect(() => {
    if (displayedListings.length === 0 && listings.length > 0) {
      setDisplayedListings(listings);
    }
  }, [listings, displayedListings.length]);

  // Execute a PATCH with serialization
  const executePatch = useCallback(async (propertyIds: string[]) => {
    if (!shareId) return;

    patchInFlightRef.current = true;
    try {
      const res = await fetch(`/api/shares/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds }),
      });

      if (res.status === 404) {
        // Session expired — clear everything
        localStorage.removeItem(SHARE_CACHE_KEY);
        setShareId(null);
        setSessionIds(null);
        pendingPatchRef.current = null;
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to update share");
      }

      // Update localStorage cache
      const cache = getShareCache();
      if (cache) {
        cache.propertyIds = propertyIds;
        localStorage.setItem(SHARE_CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.error("Error updating share:", error);
      // Revert to localStorage cache state on error
      const cache = getShareCache();
      if (cache) {
        setSessionIds(new Set(cache.propertyIds));
      }
    } finally {
      patchInFlightRef.current = false;

      // If a PATCH was queued while this one was in-flight, execute it now
      if (pendingPatchRef.current) {
        const nextIds = pendingPatchRef.current;
        pendingPatchRef.current = null;
        executePatch(nextIds);
      }
    }
  }, [shareId]);

  // Toggle a listing in/out of the share session
  const handleShareToggle = useCallback(
    (fctId: string) => {
      if (!shareId || !sessionIds) return;

      const isCurrentlyIn = sessionIds.has(fctId);
      const newSessionIds = new Set(sessionIds);

      if (isCurrentlyIn) {
        newSessionIds.delete(fctId);
      } else {
        newSessionIds.add(fctId);
      }

      // Optimistically update state
      setSessionIds(newSessionIds);
      setUpdatingIds((prev) => new Set(prev).add(fctId));

      const newPropertyIds = Array.from(newSessionIds);

      // If no properties remain, don't PATCH (API requires non-empty array)
      if (newPropertyIds.length === 0) {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(fctId);
          return next;
        });
        return;
      }

      // Serialize PATCH calls
      if (patchInFlightRef.current) {
        pendingPatchRef.current = newPropertyIds;
      } else {
        executePatch(newPropertyIds);
      }

      // Clear updating flag after a short delay (covers network latency perception)
      setTimeout(() => {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(fctId);
          return next;
        });
      }, 300);
    },
    [shareId, sessionIds, executePatch]
  );

  const hasSession = shareId !== null && sessionIds !== null;

  return (
    <div className="pb-24">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 w-full">
        {displayedListings.map((listing, index) => (
          <div
            key={listing.id}
            className="snap-start scroll-mt-20"
            style={index >= 15 ? { contentVisibility: "auto", containIntrinsicSize: "auto 420px" } : undefined}
          >
            <ListingsCard
              listing={listing}
              animationIndex={index >= 15 ? undefined : index}
              shareToggle={
                hasSession
                  ? {
                      isInSession: sessionIds.has(listing.fct_id),
                      isUpdating: updatingIds.has(listing.fct_id),
                      onToggle: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleShareToggle(listing.fct_id);
                      },
                    }
                  : undefined
              }
            />
          </div>
        ))}
        {displayedListings.length > 0 && (
          <div className="col-span-full min-h-[70vh]">
            <EndOfListings />
          </div>
        )}
      </div>
      <SavedListingsSummaryCard listings={listings} />
    </div>
  );
}
