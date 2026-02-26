"use client";

import {
  SparklesIcon,
} from "@heroicons/react/24/outline";
import TypingInput from "@/app/ui/search/TypingInput";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useListingsContext } from "@/app/context/ListingsContext";
import AnimatedText from "./components/AnimatedText";
import MapBackground from "./components/MapBackground";

const taglines = [
  // The "connections" hustle
  "Better than your friend's cousin's landlord.",
  "Better than your coworker's ex's sublet.",
  "For when your aunt's guy falls through.",
  "Your bodega guy's tips, but accurate.",

  // The desperate measures
  "Better than refreshing StreetEasy at 3am.",
  "Better than bribing the super.",
  "Skip the 6am open house line.",

  // The nightmare experiences
  "Better than a broker who ghosts you.",
  "Better than finding out it's actually in Jersey.",

  // The competition
  "Find out before it's already taken.",
  "Better than losing another bidding war.",

  // The vibes
  "The apartment hunt, minus the existential crisis.",

  // The absurd
  "We put the NYC in 'the L train is fine.'",
  "$300 energy bill, but actually has working heat and AC.",
  "Floors that are mostly level.",
  "Your toilet and kitchen can be in different rooms.",
  "We do the doom-scrolling so you don't have to.",
  "We deserve that 15% more than the brokers do.",
];

export default function Page() {
  const router = useRouter();

  // Local state for each filter
  const [searchText, setSearchText] = useState("");
  const [tagline, setTagline] = useState("");

  const { setPendingMessage } = useListingsContext();

  const handleSearch = () => {
    if (!searchText.trim()) return;

    // Store the query as a pending message and immediately redirect
    setPendingMessage(searchText);
    router.push("/listings");
  };

  // Add event listener for Enter key
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && searchText.trim()) {
        setPendingMessage(searchText);
        router.push("/listings");
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [searchText, setPendingMessage, router]);

  // Pick a random tagline on mount
  useEffect(() => {
    setTagline(taglines[Math.floor(Math.random() * taglines.length)]);
  }, []);

  // Auto-fit tagline font size to stay on one line
  const taglineRef = useRef<HTMLDivElement>(null);
  const [taglineFontSize, setTaglineFontSize] = useState<number | null>(null);

  const fitTagline = useCallback(() => {
    const el = taglineRef.current;
    if (!el || !tagline) return;

    const maxFontSize = 60; // text-6xl equivalent in px
    const minFontSize = 24;
    const containerWidth = el.parentElement!.clientWidth;

    // Binary search for the largest font size that fits on one line
    let low = minFontSize;
    let high = maxFontSize;
    el.style.whiteSpace = 'nowrap';

    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      el.style.fontSize = `${mid}px`;
      if (el.scrollWidth <= containerWidth) {
        low = mid;
      } else {
        high = mid;
      }
    }

    el.style.whiteSpace = '';
    setTaglineFontSize(low);
  }, [tagline]);

  useEffect(() => {
    fitTagline();
    window.addEventListener('resize', fitTagline);
    return () => window.removeEventListener('resize', fitTagline);
  }, [fitTagline]);

  return (
    <>
      <MapBackground />
      <main
        className="flex h-[calc(100vh-64px)] flex-col items-center justify-center relative z-10"
      >
        <div className="w-[75%] mb-10 p-6 text-center">
          <div
            ref={taglineRef}
            className="font-bold text-primary whitespace-nowrap
              drop-shadow-sm [text-shadow:_0_2px_8px_rgb(255_255_255_/_40%)]"
            style={{ fontSize: taglineFontSize ? `${taglineFontSize}px` : '60px' }}
          >
            {tagline && (
              <AnimatedText
                text={tagline}
                charDelay={15}
                startDelay={1000}
              />
            )}
          </div>
        </div>
        <div
          className="card w-3/5 animate-fade-up-delayed mb-20
            bg-base-100/80 backdrop-blur-lg
            border border-base-300/50
            shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.08)]
            rounded-full
            transition-all duration-300
            hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_12px_48px_rgba(0,0,0,0.12)]
            hover:border-primary/20"
        >
          <div className="card-body py-4 pl-6 pr-4">
            <div className="flex flex-row gap-3 items-center">
              <TypingInput onValueChange={(val) => setSearchText(val)} />
              <button
                className="btn bg-primary/80 text-primary-content text-base
                  rounded-full px-6 border border-white/10
                  backdrop-blur-sm
                  shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.1)]
                  hover:bg-primary/90 hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_8px_24px_rgba(0,0,0,0.15)]
                  transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleSearch}
                disabled={!searchText.trim()}
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
