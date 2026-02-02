"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Property } from "@/app/lib/definitions";
import type { ClaudeResponse } from "@/app/lib/claudeQueryParser";

/**
 * Generate a new thread ID for chat sessions
 */
function generateThreadId(): string {
  return `thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get or create a thread ID from localStorage (client-side only)
 */
function getInitialThreadId(): string {
  if (typeof window === "undefined") {
    // SSR: return empty string, will be initialized on client
    return "";
  }
  const stored = localStorage.getItem("chatThreadId");
  if (stored) {
    return stored;
  }
  const newId = generateThreadId();
  localStorage.setItem("chatThreadId", newId);
  return newId;
}

type ListingsContextType = {
  listings: Property[];
  queryRecord: ClaudeResponse;
  threadId: string;
  isThreadIdReady: boolean;
  pendingMessage: string | null;
  setAll: (
    listings: Property[],
    queryRecord: ClaudeResponse,
    threadId: string
  ) => void;
  setThreadId: (threadId: string) => void;
  resetThreadId: () => string;
  setPendingMessage: (msg: string | null) => void;
  clear: () => void;
  removeFilter: (filterKey: string, subKey?: string) => void;
  removeFromArrayFilter: (filterKey: string, itemToRemove: string) => void;
};

const ListingsContext = createContext<ListingsContextType | undefined>(undefined);

export const ListingsProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<Property[]>([]);
  const [queryRecord, setQueryRecord] = useState<ClaudeResponse>({});
  // Initialize with empty string for SSR, will hydrate on client
  const [threadId, setThreadIdState] = useState<string>(() => getInitialThreadId());
  const [isThreadIdReady, setIsThreadIdReady] = useState<boolean>(() => typeof window !== "undefined");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Ensure threadId is initialized on client mount
  React.useEffect(() => {
    if (!threadId) {
      const id = getInitialThreadId();
      setThreadIdState(id);
    }
    setIsThreadIdReady(true);
  }, [threadId]);

  const setAll = (
    newListings: Property[],
    newQueryRecord: ClaudeResponse,
    newThreadId: string
  ) => {
    setListings(newListings);
    setQueryRecord(newQueryRecord);
    setThreadIdState(newThreadId);
  };

  const setThreadId = (newThreadId: string) => {
    setThreadIdState(newThreadId);
    if (typeof window !== "undefined") {
      localStorage.setItem("chatThreadId", newThreadId);
    }
  };

  const resetThreadId = (): string => {
    const newId = generateThreadId();
    setThreadIdState(newId);
    if (typeof window !== "undefined") {
      localStorage.setItem("chatThreadId", newId);
    }
    return newId;
  };

  const clear = () => {
    setListings([]);
    setQueryRecord({});
    // Don't clear threadId - use resetThreadId explicitly when needed
  };

  const removeFilter = (filterKey: string, subKey?: string) => {
    setQueryRecord(prev => {
      const newRecord = { ...prev };

      if (!subKey) {
        // Remove entire filter
        delete newRecord[filterKey];
      } else {
        // Remove part of a range object (min or max)
        const range = newRecord[filterKey] as { min?: number | null; max?: number | null };
        if (range) {
          newRecord[filterKey] = { ...range, [subKey]: null };
          // If both min and max are null, remove the entire key
          const updated = newRecord[filterKey] as { min?: number | null; max?: number | null };
          if (updated.min == null && updated.max == null) {
            delete newRecord[filterKey];
          }
        }
      }
      return newRecord;
    });
  };

  const removeFromArrayFilter = (filterKey: string, itemToRemove: string) => {
    setQueryRecord(prev => {
      const newRecord = { ...prev };
      const arr = newRecord[filterKey] as string[];
      if (Array.isArray(arr)) {
        const filtered = arr.filter(item => item !== itemToRemove);
        if (filtered.length === 0) {
          delete newRecord[filterKey];
        } else {
          newRecord[filterKey] = filtered;
        }
      }
      return newRecord;
    });
  };

  return (
    <ListingsContext.Provider value={{ listings, queryRecord, threadId, isThreadIdReady, pendingMessage, setAll, setThreadId, resetThreadId, setPendingMessage, clear, removeFilter, removeFromArrayFilter }}>
      {children}
    </ListingsContext.Provider>
  );
};

export const useListingsContext = () => {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error("useListingsContext must be used within a ListingsProvider");
  return ctx;
};
