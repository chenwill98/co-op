"use client";

import { Property } from "@/app/lib/definitions";
import { useSearchParams } from "next/navigation";
import {
  ShareIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  BarsArrowUpIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect, useCallback, useMemo } from "react";

// Sort options
type SortOption = "original" | "newest" | "price-low" | "price-high";

interface SortConfig {
  label: string;
  sortFn: (a: Property, b: Property) => number;
}

interface ShareCache {
  propertyIds: string[];
  url: string;
  shareId: string;
}

const SHARE_CACHE_KEY = "share-url-cache";

function getShareCache(): ShareCache | null {
  try {
    const raw = localStorage.getItem(SHARE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ShareCache;
  } catch {
    return null;
  }
}

function setShareCache(cache: ShareCache) {
  localStorage.setItem(SHARE_CACHE_KEY, JSON.stringify(cache));
}

function clearShareCache() {
  localStorage.removeItem(SHARE_CACHE_KEY);
}

export default function SavedListingsSummaryCard({
  listings,
}: {
  listings: Property[];
}) {
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") || "";
  const [sortOption, setSortOption] = useState<SortOption>("original");
  const [sortedListings, setSortedListings] = useState<Property[]>(listings);
  const [isSharing, setIsSharing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cachedShare, setCachedShare] = useState<ShareCache | null>(null);

  // Load cached share on mount
  useEffect(() => {
    setCachedShare(getShareCache());
  }, []);

  // Current listing IDs (sorted for stable comparison)
  const currentIds = useMemo(
    () => [...listings.map((l) => l.fct_id)].sort(),
    [listings]
  );

  // Check if cached share matches current listings
  const isCacheStale = useMemo(() => {
    if (!cachedShare) return false;
    const cachedIds = [...cachedShare.propertyIds].sort();
    if (cachedIds.length !== currentIds.length) return true;
    return cachedIds.some((id, i) => id !== currentIds[i]);
  }, [cachedShare, currentIds]);

  const handleShare = async () => {
    if (listings.length === 0 || isSharing) return;
    setIsSharing(true);
    try {
      const propertyIds = listings.map((l) => l.fct_id);
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds }),
      });
      if (!res.ok) throw new Error("Failed to create share");
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.url}`;

      // Cache the share
      const cache: ShareCache = {
        propertyIds,
        url: fullUrl,
        shareId: data.shareId,
      };
      setShareCache(cache);
      setCachedShare(cache);

      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard write failed silently — user can still use the copy button
      }
    } catch (error) {
      console.error("Error sharing listings:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleGoToSession = useCallback(() => {
    if (cachedShare) {
      window.open(cachedShare.url, "_blank");
    }
  }, [cachedShare]);

  const handleSync = useCallback(async () => {
    if (!cachedShare || isSyncing) return;
    setIsSyncing(true);
    try {
      const propertyIds = listings.map((l) => l.fct_id);
      const res = await fetch(`/api/shares/${cachedShare.shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          // Share expired or deleted — clear cache
          clearShareCache();
          setCachedShare(null);
          return;
        }
        throw new Error("Failed to sync share");
      }

      // Update cache with new property IDs
      const updatedCache: ShareCache = {
        ...cachedShare,
        propertyIds,
      };
      setShareCache(updatedCache);
      setCachedShare(updatedCache);
    } catch (error) {
      console.error("Error syncing share:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [cachedShare, isSyncing, listings]);

  const handleCopyUrl = useCallback(async () => {
    if (!cachedShare) return;
    try {
      await navigator.clipboard.writeText(cachedShare.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = cachedShare.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [cachedShare]);

  // Sort configurations
  const sortConfigs: Record<SortOption, SortConfig> = {
    original: {
      label: "Order Saved",
      sortFn: () => 0 // No sorting
    },
    newest: {
      label: "Newest",
      sortFn: (a, b) => new Date(b.listed_at).getTime() - new Date(a.listed_at).getTime()
    },
    "price-low": {
      label: "Least Expensive",
      sortFn: (a, b) => a.price - b.price
    },
    "price-high": {
      label: "Most Expensive",
      sortFn: (a, b) => b.price - a.price
    }
  };

  // Apply sorting whenever the sort option or listings change
  useEffect(() => {
    if (sortOption === "original") {
      setSortedListings([...listings]);
    } else {
      const sorted = [...listings].sort(sortConfigs[sortOption].sortFn);
      setSortedListings(sorted);
    }
  }, [listings, sortOption]);

  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
  };

  // For backwards compatibility with URL params
  const getSortText = () => {
    switch (sort) {
      case "newest":
        return "Sorted by newest first";
      case "least_expensive":
        return "Sorted by price: Low to High";
      case "most_expensive":
        return "Sorted by price: High to Low";
      default:
        return sortOption !== "original" ?
          `Sorted by ${sortConfigs[sortOption].label.toLowerCase()}` :
          "Shown in the order you saved them";
    }
  };

  // Pass sorted listings to parent component
  useEffect(() => {
    // Emit event with sorted listings that can be caught by parent component
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('listings-sorted', {
        detail: { listings: sortedListings }
      });
      window.dispatchEvent(event);
    }
  }, [sortedListings]);

  const priceRange = listings.length > 0
    ? `$${Math.min(...listings.map((l) => l.price)).toLocaleString()} – $${Math.max(...listings.map((l) => l.price)).toLocaleString()}`
    : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-transparent pointer-events-none">
      <div className="container mx-auto pointer-events-auto w-full px-4 md:w-2/3 lg:w-3/5">
        <div className="flex flex-row">
          <div className="flex-grow p-4">
            <div className="card bg-base-100/80 backdrop-blur-lg rounded-4xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.08)] mx-auto">
              <div className="card-body p-3">
                {/* Summary line */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="font-semibold text-primary">
                    {listings.length} {listings.length === 1 ? "Property" : "Properties"} Saved
                  </span>
                  {priceRange && (
                    <>
                      <span className="text-base-content/40">&middot;</span>
                      <span className="text-base-content/60">{priceRange}</span>
                    </>
                  )}
                  {sortOption !== "original" && (
                    <>
                      <span className="text-base-content/40">&middot;</span>
                      <span className="text-base-content/60">{getSortText()}</span>
                    </>
                  )}
                </div>
                {/* Divider */}
                <div className="border-t border-base-300/50 mx-1 my-1" />
                {/* Controls row */}
                <div className="flex items-center justify-between">
                  {/* Left: share/session/sync/URL bar */}
                  <div className="flex items-center gap-2">
                    {!cachedShare ? (
                      <button
                        className="btn btn-sm rounded-full glass-badge-primary hover:brightness-[0.82] active:scale-95 transition-all duration-150"
                        onClick={handleShare}
                        disabled={listings.length === 0 || isSharing}
                      >
                        {isSharing ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <ShareIcon className="w-4 h-4" />
                        )}
                        Share
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-sm rounded-full glass-badge-primary hover:brightness-[0.82] active:scale-95 transition-all duration-150"
                          onClick={handleGoToSession}
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          Go to Session
                        </button>
                        {isCacheStale && (
                          <button
                            className="btn btn-sm rounded-full glass-badge-primary hover:brightness-[0.82] active:scale-95 transition-all duration-150"
                            onClick={handleSync}
                            disabled={isSyncing}
                          >
                            {isSyncing ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <ArrowPathIcon className="w-4 h-4" />
                            )}
                            Sync
                          </button>
                        )}
                      </>
                    )}
                    {/* Inline URL bar */}
                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center gap-2 ${
                        cachedShare
                          ? "opacity-100"
                          : "max-w-0 opacity-0"
                      }`}
                    >
                      <input
                        type="text"
                        readOnly
                        value={cachedShare?.url || ""}
                        size={cachedShare?.url?.length || 20}
                        className="input glass-input input-sm text-xs"
                      />
                      <button className="btn btn-sm rounded-full glass-badge-primary hover:brightness-[0.82] active:scale-95 transition-all duration-150 whitespace-nowrap" onClick={handleCopyUrl}>
                        {copied ? (
                          <>
                            <CheckIcon className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentIcon className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Right: sort circle button */}
                  <div className="dropdown dropdown-top dropdown-end">
                    <label tabIndex={0} className="btn btn-circle p-2">
                      <BarsArrowUpIcon className="h-5 w-5" />
                    </label>
                    <ul tabIndex={0} className="dropdown-content menu glass-dropdown rounded-box z-[100] w-52 p-2">
                      {Object.entries(sortConfigs).map(([key, config]) => (
                        <li key={key} className={sortOption === key ? "bg-primary/15 rounded-lg font-medium text-primary" : ""}>
                          <a onClick={() => handleSortChange(key as SortOption)}>
                            {config.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
