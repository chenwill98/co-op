"use client";

import { Property } from "@/app/lib/definitions";
import { VotesMap } from "@/app/lib/dynamodb-shares";
import SharedListingsCard from "./SharedListingsCard";
import SharedListingsSummaryCard from "./SharedListingsSummaryCard";
import { useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface SharedListingsGridProps {
  listings: Property[];
  votes: VotesMap;
  createdAt: number;
  onVote: (propertyId: string, direction: "up" | "down" | "none") => Promise<void>;
}

export default function SharedListingsGrid({
  listings,
  votes,
  createdAt,
  onVote,
}: SharedListingsGridProps) {
  const isFirstRender = useRef(true);

  // Sort listings by net score (upvotes - downvotes) descending.
  // Stable sort preserves original order for ties.
  const sortedListings = useMemo(() => {
    const sorted = [...listings].sort((a, b) => {
      const aVotes = votes[a.fct_id];
      const bVotes = votes[b.fct_id];
      const aNet = (aVotes?.upvotes || 0) - (aVotes?.downvotes || 0);
      const bNet = (bVotes?.upvotes || 0) - (bVotes?.downvotes || 0);
      return bNet - aNet;
    });

    // After first render, disable entrance animation indices
    if (isFirstRender.current) {
      // Defer to after the initial paint
      requestAnimationFrame(() => {
        isFirstRender.current = false;
      });
    }

    return sorted;
  }, [listings, votes]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 w-full">
      <SharedListingsSummaryCard listings={listings} createdAt={createdAt} />
      <AnimatePresence>
        {sortedListings.map((listing, index) => (
          <motion.div
            key={listing.id}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <SharedListingsCard
              listing={listing}
              votes={
                votes[listing.fct_id] || {
                  upvotes: 0,
                  downvotes: 0,
                  userVote: null,
                }
              }
              animationIndex={isFirstRender.current ? index : undefined}
              onVote={onVote}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
