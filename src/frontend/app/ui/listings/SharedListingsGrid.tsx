"use client";

import { Property } from "@/app/lib/definitions";
import { VotesMap } from "@/app/lib/dynamodb-shares";
import ListingsCard from "./ListingsCard";
import SharedListingsSummaryCard from "./SharedListingsSummaryCard";
import EndOfListings from "./EndOfListings";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
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

  // Per-card optimistic vote state: propertyId → { upvotes, downvotes, userVote }
  const [optimisticVotes, setOptimisticVotes] = useState<
    Record<string, { upvotes: number; downvotes: number; userVote: "up" | "down" | null }>
  >({});
  // Per-card voting-in-flight flag
  const [votingFlags, setVotingFlags] = useState<Record<string, boolean>>({});

  // Clear optimistic state when server votes change (new poll data arrived)
  const prevVotesRef = useRef(votes);
  useEffect(() => {
    if (prevVotesRef.current !== votes) {
      setOptimisticVotes({});
      prevVotesRef.current = votes;
    }
  }, [votes]);

  const getDisplayVotes = useCallback(
    (fctId: string) => {
      if (optimisticVotes[fctId]) return optimisticVotes[fctId];
      const serverVotes = votes[fctId];
      return {
        upvotes: serverVotes?.upvotes || 0,
        downvotes: serverVotes?.downvotes || 0,
        userVote: (serverVotes?.userVote as "up" | "down" | null) || null,
      };
    },
    [optimisticVotes, votes]
  );

  const handleVote = useCallback(
    async (fctId: string, direction: "up" | "down") => {
      if (votingFlags[fctId]) return;

      const current = getDisplayVotes(fctId);
      let newUp = current.upvotes;
      let newDown = current.downvotes;
      let newUserVote: "up" | "down" | null;
      let apiDirection: "up" | "down" | "none";

      if (current.userVote === direction) {
        // Toggle off
        if (direction === "up") newUp--;
        else newDown--;
        newUserVote = null;
        apiDirection = "none";
      } else {
        // Switch or fresh vote
        if (current.userVote) {
          if (current.userVote === "up") newUp--;
          else newDown--;
        }
        if (direction === "up") newUp++;
        else newDown++;
        newUserVote = direction;
        apiDirection = direction;
      }

      setOptimisticVotes((prev) => ({
        ...prev,
        [fctId]: { upvotes: newUp, downvotes: newDown, userVote: newUserVote },
      }));

      setVotingFlags((prev) => ({ ...prev, [fctId]: true }));
      try {
        await onVote(fctId, apiDirection);
      } catch {
        // Revert optimistic update on failure
        setOptimisticVotes((prev) => {
          const next = { ...prev };
          delete next[fctId];
          return next;
        });
      } finally {
        setVotingFlags((prev) => ({ ...prev, [fctId]: false }));
      }
    },
    [votingFlags, getDisplayVotes, onVote]
  );

  // Sort listings by net score (upvotes - downvotes) descending.
  // Stable sort preserves original order for ties.
  const sortedListings = useMemo(() => {
    const sorted = [...listings].sort((a, b) => {
      const aDisplay = getDisplayVotes(a.fct_id);
      const bDisplay = getDisplayVotes(b.fct_id);
      const aNet = aDisplay.upvotes - aDisplay.downvotes;
      const bNet = bDisplay.upvotes - bDisplay.downvotes;
      return bNet - aNet;
    });

    // After first render, disable entrance animation indices
    if (isFirstRender.current) {
      requestAnimationFrame(() => {
        isFirstRender.current = false;
      });
    }

    return sorted;
  }, [listings, getDisplayVotes]);

  return (
    <div className="pb-24">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 w-full">
        <AnimatePresence>
          {sortedListings.map((listing, index) => {
            const display = getDisplayVotes(listing.fct_id);
            return (
              <motion.div
                key={listing.id}
                className="snap-start scroll-mt-20"
                layout
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={index >= 15 ? { contentVisibility: "auto", containIntrinsicSize: "auto 420px" } : undefined}
              >
                <ListingsCard
                  listing={listing}
                  animationIndex={isFirstRender.current && index < 15 ? index : undefined}
                  hideBookmark
                  voteState={{
                    upvotes: display.upvotes,
                    downvotes: display.downvotes,
                    userVote: display.userVote,
                    onVote: (direction) => handleVote(listing.fct_id, direction),
                    isVoting: !!votingFlags[listing.fct_id],
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        {sortedListings.length > 0 && (
          <div className="col-span-full min-h-[70vh]">
            <EndOfListings />
          </div>
        )}
      </div>
      <SharedListingsSummaryCard listings={listings} createdAt={createdAt} />
    </div>
  );
}
