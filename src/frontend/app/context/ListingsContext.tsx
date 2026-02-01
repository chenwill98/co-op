"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Property } from "@/app/lib/definitions";
import type { ClaudeResponse } from "@/app/lib/claudeQueryParser";

type ListingsContextType = {
  listings: Property[];
  queryRecord: ClaudeResponse;
  threadId: string;
  setAll: (
    listings: Property[],
    queryRecord: ClaudeResponse,
    threadId: string
  ) => void;
  setThreadId: (threadId: string) => void;
  clear: () => void;
};

const ListingsContext = createContext<ListingsContextType | undefined>(undefined);

export const ListingsProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<Property[]>([]);
  const [queryRecord, setQueryRecord] = useState<ClaudeResponse>({});
  const [threadId, setThreadIdState] = useState<string>("");

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
  };

  const clear = () => {
    setListings([]);
    setQueryRecord({});
    // Don't clear threadId - generate new one in ChatBox when needed
  };

  return (
    <ListingsContext.Provider value={{ listings, queryRecord, threadId, setAll, setThreadId, clear }}>
      {children}
    </ListingsContext.Provider>
  );
};

export const useListingsContext = () => {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error("useListingsContext must be used within a ListingsProvider");
  return ctx;
};
