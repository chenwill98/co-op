import { Property } from "@/app/lib/definitions";
import Link from "next/link";
import Image from 'next/image';
import { netEffectivePrice } from "@/app/lib/searchUtils";
import { FormatDisplayText, TagList } from "@/app/ui/utilities";
import BookmarkIcon from "@/app/ui/icons/BookmarkIcon";
import MapButton from "@/app/ui/icons/MapButton";
import VoteButtons from "@/app/ui/icons/VoteButtons";
import ShareToggleButton from "@/app/ui/icons/ShareToggleButton";

import { useState, useRef, useCallback, useEffect } from "react";

// --- useImageCycler hook ---

interface SlotState {
  src: string;
  visible: boolean;
}

function useImageCycler(images: string[] | undefined, thumbnailImage: string | null) {
  const fallback = thumbnailImage || '';

  // Build deduplicated image list: thumbnail first, then remaining images, capped at 8
  const cyclableImages = useRef<string[]>([]);
  const imageSet = new Set<string>();
  const built: string[] = [];
  if (fallback) {
    imageSet.add(fallback);
    built.push(fallback);
  }
  if (images) {
    for (const img of images) {
      if (!imageSet.has(img) && built.length < 8) {
        imageSet.add(img);
        built.push(img);
      }
    }
  }
  cyclableImages.current = built;

  const imageCount = cyclableImages.current.length;
  const canCycle = imageCount > 1;

  // Slot state — only these trigger re-renders
  const [slotA, setSlotA] = useState<SlotState>({ src: fallback, visible: true });
  const [slotB, setSlotB] = useState<SlotState>({ src: fallback, visible: false });
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mutable refs for timer/state callbacks
  const activeSlotRef = useRef<'A' | 'B'>('A');
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const srcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);

  // Track whether each slot's <Image> has finished loading its current src
  const slotLoadedRef = useRef({ A: true, B: false });
  // Track each slot's current src (for same-src detection)
  const slotSrcRef = useRef({ A: fallback, B: fallback });
  // When a timer tick wants to crossfade but the target isn't loaded yet
  const pendingRef = useRef(false);

  // Perform the actual crossfade: swap visibility, prep next image in hidden slot
  const crossfade = useCallback(() => {
    const imgs = cyclableImages.current;
    const prevSlot = activeSlotRef.current;
    const nextIndex = (indexRef.current + 1) % imgs.length;

    if (prevSlot === 'A') {
      setSlotB((prev) => ({ ...prev, visible: true }));
      setSlotA((prev) => ({ ...prev, visible: false }));
      activeSlotRef.current = 'B';
    } else {
      setSlotA((prev) => ({ ...prev, visible: true }));
      setSlotB((prev) => ({ ...prev, visible: false }));
      activeSlotRef.current = 'A';
    }

    indexRef.current = nextIndex;
    setCurrentIndex(nextIndex);

    // Defer src change until opacity transition completes (500ms matches duration-500).
    // Changing the hidden slot's src immediately would flash the next-next image
    // during the crossfade because the fading-out slot is still partially visible.
    const nnIndex = (nextIndex + 1) % imgs.length;
    const nnSrc = imgs[nnIndex];

    if (srcTimeoutRef.current) clearTimeout(srcTimeoutRef.current);
    srcTimeoutRef.current = setTimeout(() => {
      if (!isActiveRef.current) return;

      const hiddenSlot = activeSlotRef.current === 'B' ? 'A' : 'B';
      if (nnSrc === slotSrcRef.current[hiddenSlot]) {
        slotLoadedRef.current[hiddenSlot] = true;
      } else {
        slotLoadedRef.current[hiddenSlot] = false;
        slotSrcRef.current[hiddenSlot] = nnSrc;
      }
      if (hiddenSlot === 'A') {
        setSlotA((prev) => ({ ...prev, src: nnSrc }));
      } else {
        setSlotB((prev) => ({ ...prev, src: nnSrc }));
      }
    }, 500);
  }, []);

  // Timer tick: attempt crossfade only if target slot's image is loaded
  const tick = useCallback(() => {
    if (!isActiveRef.current) return;
    const target = activeSlotRef.current === 'A' ? 'B' : 'A';
    if (slotLoadedRef.current[target]) {
      pendingRef.current = false;
      crossfade();
    } else {
      pendingRef.current = true;
    }
  }, [crossfade]);

  // Called by <Image onLoad> — if a crossfade was waiting, execute it now
  const onSlotLoaded = useCallback((slot: 'A' | 'B') => {
    slotLoadedRef.current[slot] = true;
    if (pendingRef.current && isActiveRef.current && slot !== activeSlotRef.current) {
      pendingRef.current = false;
      crossfade();
    }
  }, [crossfade]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (srcTimeoutRef.current) {
      clearTimeout(srcTimeoutRef.current);
      srcTimeoutRef.current = null;
    }
    isActiveRef.current = false;
    pendingRef.current = false;
    slotLoadedRef.current = { A: true, B: false };
    slotSrcRef.current = { A: fallback, B: fallback };
    // Reset to thumbnail
    setSlotA({ src: fallback, visible: true });
    setSlotB({ src: fallback, visible: false });
    activeSlotRef.current = 'A';
    indexRef.current = 0;
    setCurrentIndex(0);
    setIsActive(false);
  }, [fallback]);

  const start = useCallback(() => {
    if (!canCycle) return;

    isActiveRef.current = true;
    setIsActive(true);

    // Immediately set slot B's src to the second image (hidden, opacity 0).
    // The <Image> component will start loading; onSlotLoaded('B') fires when ready.
    const nextSrc = cyclableImages.current[1];
    slotLoadedRef.current.B = false;
    slotSrcRef.current.B = nextSrc;
    setSlotB({ src: nextSrc, visible: false });

    // First crossfade after initial delay, then every 2s
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      tick();
      intervalRef.current = setInterval(tick, 2000);
    }, 800);
  }, [canCycle, tick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (srcTimeoutRef.current) clearTimeout(srcTimeoutRef.current);
    };
  }, []);

  return { slotA, slotB, isActive, currentIndex, imageCount, start, stop, canCycle, onSlotLoaded };
}

// --- ListingsCard component ---

interface ListingsCardProps {
  listing: Property;
  animationIndex?: number;
  hideBookmark?: boolean;
  voteState?: {
    upvotes: number;
    downvotes: number;
    userVote: "up" | "down" | null;
    onVote: (direction: "up" | "down") => void;
    isVoting: boolean;
  };
  shareToggle?: {
    isInSession: boolean;
    isUpdating: boolean;
    onToggle: (e: React.MouseEvent) => void;
  };
}

export default function ListingsCard({ listing, animationIndex, hideBookmark, voteState, shareToggle }: ListingsCardProps) {
  const [showMap, setShowMap] = useState(false);
  const { slotA, slotB, isActive, currentIndex, imageCount, start, stop, canCycle, onSlotLoaded } =
    useImageCycler(listing.images, listing.thumbnail_image);
  const mapboxToken = process.env.MAPBOX_TOKEN;
  const staticMapUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+f74e4e(${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'})/${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'},14/600x600@2x?access_token=${mapboxToken}`
    : null;

  // Stop cycling if listing changes (e.g., sort reorder while hovered)
  const listingId = listing.id;
  useEffect(() => {
    return () => stop();
  }, [listingId, stop]);

  // Calculate animation delay (50ms increments, capped at 400ms)
  const animationDelay = animationIndex !== undefined
    ? Math.min(animationIndex * 50, 400)
    : 0;

  return (
    <Link
        href={`/listings/${listing.id}`}
        key={listing.id}
        className={`group card rounded-2xl border border-base-300/50 bg-base-100 shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_12px_40px_rgba(0,0,0,0.12)] transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/20 ${animationIndex !== undefined ? 'animate-fade-up-fast' : ''}`}
        style={animationIndex !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      <figure
        className="aspect-[3/2] relative bg-primary/10 overflow-hidden"
        onMouseEnter={() => { if (!showMap) start(); }}
        onMouseLeave={stop}
      >
        <div className="overflow-hidden rounded relative w-full h-full">
          {/* Map layer (z-1): always show for cards without a thumbnail, or when map toggled */}
          {(!listing.thumbnail_image || showMap) && staticMapUrl && (
            <div
              className="pointer-events-none absolute top-0 left-0 w-full h-full transition-opacity duration-500 opacity-100"
              style={{ zIndex: 1 }}
            >
              <Image
                src={staticMapUrl}
                alt={`Map location for ${listing.address}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 30vw"
                className="thumbnail object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}
          {!listing.thumbnail_image && !staticMapUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-base-content/60">
              Map unavailable
            </div>
          )}
          {/* Slot A (z-2): primary image slot */}
          {listing.thumbnail_image && (
            <div
              className={`pointer-events-none absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${showMap ? 'opacity-0' : slotA.visible ? 'opacity-100' : 'opacity-0'}`}
              style={{ zIndex: 2 }}
            >
              <Image
                src={slotA.src || listing.thumbnail_image}
                alt={listing.address}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 30vw"
                className="thumbnail object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105"
                onLoad={() => onSlotLoaded('A')}
              />
            </div>
          )}
          {/* Slot B (z-3): secondary image slot for crossfade */}
          {listing.thumbnail_image && canCycle && (
            <div
              className={`pointer-events-none absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${showMap ? 'opacity-0' : slotB.visible ? 'opacity-100' : 'opacity-0'}`}
              style={{ zIndex: 3 }}
            >
              <Image
                src={slotB.src || listing.thumbnail_image}
                alt={listing.address}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 30vw"
                className="thumbnail object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105"
                onLoad={() => onSlotLoaded('B')}
              />
            </div>
          )}
        </div>
        {/* Vote score badge — top left overlay */}
        {voteState && (
          <div className="absolute top-2 left-2 z-10">
            <span className={`px-2 py-0.5 rounded-full bg-base-100/70 backdrop-blur-sm text-sm font-bold shadow-sm ${
              (voteState.upvotes - voteState.downvotes) > 0
                ? "text-success"
                : (voteState.upvotes - voteState.downvotes) < 0
                  ? "text-error"
                  : "text-base-content/60"
            }`}>
              {(voteState.upvotes - voteState.downvotes) > 0 ? "+" : ""}
              {voteState.upvotes - voteState.downvotes}
            </span>
          </div>
        )}
        {/* Dot indicator — bottom center, between bookmark and map button */}
        {isActive && canCycle && !showMap && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 items-center">
            {Array.from({ length: imageCount }, (_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-opacity duration-300 ${
                  i === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
        {/* Bottom left overlay buttons */}
        {voteState ? (
          <div className="absolute left-2 bottom-2 z-10">
            <VoteButtons
              votes={{
                upvotes: voteState.upvotes,
                downvotes: voteState.downvotes,
                userVote: voteState.userVote,
              }}
              onVote={voteState.onVote}
              isVoting={voteState.isVoting}
            />
          </div>
        ) : (
          !hideBookmark && (
            <div className="absolute left-2 bottom-2 z-10 flex items-center gap-1.5">
              <BookmarkIcon property={listing} onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}/>
              {shareToggle && (
                <ShareToggleButton
                  isInSession={shareToggle.isInSession}
                  isUpdating={shareToggle.isUpdating}
                  onClick={shareToggle.onToggle}
                />
              )}
            </div>
          )
        )}
        {listing.thumbnail_image && staticMapUrl && (
          <div className="absolute right-2 bottom-2 z-10">
            <MapButton
              showingMap={showMap}
              onToggleMap={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMap((v) => !v);
              }}
            />
          </div>
        )}
      </figure>
      <div className="card-body flex flex-col p-3 gap-1">
        {/* Tags — single line, compact */}
        <TagList tags={listing.tag_list || []} compact />

        {/* Price — net effective (base + monthly broker fee) */}
        <div className="flex flex-row items-baseline gap-2">
          <div className="text-2xl font-bold">
            ${netEffectivePrice(listing).toLocaleString()}
          </div>
          {!listing.no_fee ? (
            <span className="text-xs text-base-content/50">net effective</span>
          ) : (
            <div className="badge glass-badge-primary text-primary rounded-full text-[0.7rem] py-0.5 h-auto min-h-0 px-2 relative top-[-2px]">
              No Fee
            </div>
          )}
        </div>

        {/* Dimensions + Address — anchored to bottom */}
        <div className="flex flex-col mt-auto gap-0.5">
          <div className="text-base-content/60 text-[0.85rem] space-x-1">
            <span>
              <span className="font-semibold text-base-content">{listing.bedrooms}</span>{" "}
              {listing.bedrooms === 1 ? "bed" : "beds"}
            </span>
            <span>•</span>
            <span>
              <span className="font-semibold text-base-content">{listing.bathrooms}</span>{" "}
              {listing.bathrooms && listing.bathrooms % 1 === 0 ? (listing.bathrooms === 1 ? "bath" : "baths") : "baths"}
            </span>
            <span>•</span>
            <span>
              <span className="font-semibold text-base-content">{listing.sqft === null ? "N/A" : listing.sqft === 0 ? "-" : listing.sqft}</span> ft
              <sup>2</sup>
            </span>
          </div>
          <h2 className="hover:text-primary transition-colors truncate" title={listing.address}>{listing.address}</h2>
          <p className="text-base-content/60 text-xs">
            Rental unit in {FormatDisplayText(listing.neighborhood)}
          </p>
        </div>
      </div>
    </Link>
  );
}
