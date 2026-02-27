"use client";

import { HandThumbUpIcon, HandThumbDownIcon } from "@heroicons/react/24/outline";
import {
  HandThumbUpIcon as HandThumbUpSolid,
  HandThumbDownIcon as HandThumbDownSolid,
} from "@heroicons/react/24/solid";

export interface VoteButtonsProps {
  votes: {
    upvotes: number;
    downvotes: number;
    userVote: "up" | "down" | null;
  };
  onVote: (direction: "up" | "down") => void;
  isVoting: boolean;
}

export default function VoteButtons({ votes, onVote, isVoting }: VoteButtonsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        role="button"
        tabIndex={0}
        className={`btn btn-circle bg-base-100/70 backdrop-blur-sm border-0 cursor-pointer hover:bg-base-100/90 active:scale-90 transition shadow-sm ${
          votes.userVote === "up" ? "text-success" : "text-primary hover:text-success"
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isVoting) onVote("up");
        }}
      >
        {votes.userVote === "up" ? (
          <HandThumbUpSolid className="w-5 h-5" />
        ) : (
          <HandThumbUpIcon className="w-5 h-5" />
        )}
      </div>
      <div
        role="button"
        tabIndex={0}
        className={`btn btn-circle bg-base-100/70 backdrop-blur-sm border-0 cursor-pointer hover:bg-base-100/90 active:scale-90 transition shadow-sm ${
          votes.userVote === "down" ? "text-error" : "text-primary hover:text-error"
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isVoting) onVote("down");
        }}
      >
        {votes.userVote === "down" ? (
          <HandThumbDownSolid className="w-5 h-5" />
        ) : (
          <HandThumbDownIcon className="w-5 h-5" />
        )}
      </div>
    </div>
  );
}
