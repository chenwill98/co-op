"use client";

import { Property } from "@/app/lib/definitions";
import { VoteResult } from "@/app/lib/dynamodb-shares";
import ListingsCard from "./ListingsCard";
import { HandThumbUpIcon, HandThumbDownIcon } from "@heroicons/react/24/outline";
import {
  HandThumbUpIcon as HandThumbUpSolid,
  HandThumbDownIcon as HandThumbDownSolid,
} from "@heroicons/react/24/solid";
import { useState, useEffect, useRef } from "react";

interface SharedListingsCardProps {
  listing: Property;
  votes: VoteResult & { userVote?: "up" | "down" | null };
  animationIndex?: number;
  onVote: (propertyId: string, direction: "up" | "down" | "none") => Promise<void>;
}

export default function SharedListingsCard({
  listing,
  votes,
  animationIndex,
  onVote,
}: SharedListingsCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticVotes, setOptimisticVotes] = useState<{
    upvotes: number;
    downvotes: number;
    userVote: "up" | "down" | null;
  } | null>(null);

  // Clear optimistic state when server votes change (new poll data arrived)
  const prevVotesRef = useRef(votes);
  useEffect(() => {
    if (
      prevVotesRef.current.upvotes !== votes.upvotes ||
      prevVotesRef.current.downvotes !== votes.downvotes ||
      prevVotesRef.current.userVote !== votes.userVote
    ) {
      setOptimisticVotes(null);
      prevVotesRef.current = votes;
    }
  }, [votes]);

  const displayVotes = optimisticVotes || {
    upvotes: votes.upvotes,
    downvotes: votes.downvotes,
    userVote: votes.userVote || null,
  };

  const netScore = displayVotes.upvotes - displayVotes.downvotes;

  const handleVote = async (direction: "up" | "down") => {
    if (isVoting) return;

    const currentUserVote = displayVotes.userVote;
    let newUp = displayVotes.upvotes;
    let newDown = displayVotes.downvotes;
    let newUserVote: "up" | "down" | null;
    let apiDirection: "up" | "down" | "none";

    if (currentUserVote === direction) {
      // Toggle off — remove the existing vote
      if (direction === "up") newUp--;
      else newDown--;
      newUserVote = null;
      apiDirection = "none";
    } else {
      // Switching or fresh vote
      if (currentUserVote) {
        if (currentUserVote === "up") newUp--;
        else newDown--;
      }
      if (direction === "up") newUp++;
      else newDown++;
      newUserVote = direction;
      apiDirection = direction;
    }

    setOptimisticVotes({
      upvotes: newUp,
      downvotes: newDown,
      userVote: newUserVote,
    });

    setIsVoting(true);
    try {
      await onVote(listing.fct_id, apiDirection);
    } catch {
      // Revert optimistic update on failure
      setOptimisticVotes(null);
    } finally {
      setIsVoting(false);
    }
  };

  const scoreColor =
    netScore > 0
      ? "text-success"
      : netScore < 0
        ? "text-error"
        : "text-base-content/60";

  const scorePrefix = netScore > 0 ? "+" : "";

  return (
    <div className="card-slot">
      <ListingsCard
        listing={listing}
        animationIndex={animationIndex}
        hideBookmark
      />
      <div className="card-slot-footer">
        <button
          className={`btn btn-sm btn-ghost gap-1 ${
            displayVotes.userVote === "up"
              ? "text-success"
              : "text-base-content/60"
          }`}
          onClick={(e) => {
            e.preventDefault();
            handleVote("up");
          }}
          disabled={isVoting}
        >
          {displayVotes.userVote === "up" ? (
            <HandThumbUpSolid className="w-4 h-4" />
          ) : (
            <HandThumbUpIcon className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{displayVotes.upvotes}</span>
        </button>
        <span className={`text-lg font-bold ${scoreColor}`}>
          {scorePrefix}{netScore}
        </span>
        <button
          className={`btn btn-sm btn-ghost gap-1 ${
            displayVotes.userVote === "down"
              ? "text-error"
              : "text-base-content/60"
          }`}
          onClick={(e) => {
            e.preventDefault();
            handleVote("down");
          }}
          disabled={isVoting}
        >
          {displayVotes.userVote === "down" ? (
            <HandThumbDownSolid className="w-4 h-4" />
          ) : (
            <HandThumbDownIcon className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{displayVotes.downvotes}</span>
        </button>
      </div>
    </div>
  );
}
