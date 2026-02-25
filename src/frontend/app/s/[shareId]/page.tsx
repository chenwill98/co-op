"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Property } from "@/app/lib/definitions";
import { VotesMap } from "@/app/lib/dynamodb-shares";
import SharedListingsGrid from "@/app/ui/listings/SharedListingsGrid";
import { ListingsGridSkeleton } from "@/app/ui/skeletons";

type ShareState =
  | { status: "loading" }
  | { status: "not_found" }
  | {
      status: "loaded";
      properties: Property[];
      votes: VotesMap;
      createdAt: number;
      missingCount: number;
    }
  | { status: "error" };

const BASE_POLL_INTERVAL = 2000;
const MAX_POLL_INTERVAL = 60000;

function getOrCreateSessionId(): string {
  const key = "share-session-id";
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export default function SharedListingsPage() {
  const params = useParams<{ shareId: string }>();
  const shareId = params.shareId;
  const [state, setState] = useState<ShareState>({ status: "loading" });
  const [sessionId, setSessionId] = useState<string>("");
  const pollIntervalRef = useRef(BASE_POLL_INTERVAL);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Initialize session ID
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  // Fetch share data on mount
  useEffect(() => {
    if (!shareId) return;

    async function fetchShare() {
      try {
        const res = await fetch(`/api/shares/${shareId}`);
        if (res.status === 404) {
          setState({ status: "not_found" });
          return;
        }
        if (!res.ok) {
          setState({ status: "error" });
          return;
        }
        const data = await res.json();
        const totalCount = data.totalPropertyCount ?? data.properties.length;
        setState({
          status: "loaded",
          properties: data.properties,
          votes: data.votes,
          createdAt: data.createdAt,
          missingCount: totalCount - data.properties.length,
        });
      } catch {
        setState({ status: "error" });
      }
    }

    fetchShare();
  }, [shareId]);

  // Poll for vote updates
  const pollVotes = useCallback(async () => {
    if (!shareId || !sessionId) return;

    try {
      const res = await fetch(
        `/api/shares/${shareId}/votes?sessionId=${encodeURIComponent(sessionId)}`
      );

      if (res.status === 429) {
        // Back off on rate limiting
        pollIntervalRef.current = Math.min(
          pollIntervalRef.current * 2,
          MAX_POLL_INTERVAL
        );
        return;
      }

      if (res.ok) {
        const data = await res.json();
        // Reset interval on success
        pollIntervalRef.current = BASE_POLL_INTERVAL;

        setState((prev) => {
          if (prev.status !== "loaded") return prev;
          return { ...prev, votes: data.votes };
        });
      }
    } catch {
      // Network error — back off
      pollIntervalRef.current = Math.min(
        pollIntervalRef.current * 2,
        MAX_POLL_INTERVAL
      );
    }
  }, [shareId, sessionId]);

  // Set up polling with visibility API
  useEffect(() => {
    if (state.status !== "loaded" || !sessionId) return;

    let isVisible = !document.hidden;

    const scheduleNextPoll = () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      if (isVisible) {
        pollTimeoutRef.current = setTimeout(async () => {
          await pollVotes();
          scheduleNextPoll();
        }, pollIntervalRef.current);
      }
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        // Resume polling immediately
        pollVotes().then(scheduleNextPoll);
      } else {
        // Pause polling
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleNextPoll();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [state.status, sessionId, pollVotes]);

  const handleVote = useCallback(
    async (propertyId: string, direction: "up" | "down" | "none") => {
      if (!shareId || !sessionId) return;

      const res = await fetch(`/api/shares/${shareId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, direction, sessionId }),
      });

      if (!res.ok) {
        throw new Error("Vote failed");
      }
    },
    [shareId, sessionId]
  );

  if (state.status === "loading") {
    return (
      <div className="flex justify-center w-full page-gradient min-h-screen">
        <div className="container mx-auto w-full px-4 md:w-5/6 lg:w-5/7">
          <ListingsGridSkeleton />
        </div>
      </div>
    );
  }

  if (state.status === "not_found") {
    return (
      <div className="flex justify-center items-center w-full page-gradient min-h-screen">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-primary mb-2">Not Found</h2>
          <p className="text-base-content/60">
            This shared collection was not found or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex justify-center items-center w-full page-gradient min-h-screen">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-error mb-2">Error</h2>
          <p className="text-base-content/60">
            Something went wrong loading this collection. Please try again
            later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full page-gradient min-h-screen">
      <div className="container mx-auto w-full px-4 md:w-5/6 lg:w-5/7">
        {state.missingCount > 0 && (
          <div className="mx-4 mt-4 glass-alert rounded-xl p-3 text-sm text-base-content/70">
            {state.missingCount}{" "}
            {state.missingCount === 1 ? "listing has" : "listings have"} been
            removed since this collection was shared.
          </div>
        )}
        <SharedListingsGrid
          listings={state.properties}
          votes={state.votes}
          createdAt={state.createdAt}
          onVote={handleVote}
        />
      </div>
    </div>
  );
}
