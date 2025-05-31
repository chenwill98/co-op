"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Property, ChatHistory } from "@/app/lib/definitions";

type ListingsContextType = {
  listings: Property[];
  queryRecord: Record<string, any>;
  chatHistory: ChatHistory;
  setAll: (
    listings: Property[],
    queryRecord: Record<string, any>,
    chatHistory: ChatHistory
  ) => void;
  clear: () => void;
};

const ListingsContext = createContext<ListingsContextType | undefined>(undefined);

export const ListingsProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<Property[]>([]);
  const [queryRecord, setQueryRecord] = useState<Record<string, any>>({});
  const [chatHistory, setChatHistory] = useState<ChatHistory>([]);

  const setAll = (
    newListings: Property[],
    newQueryRecord: Record<string, any>,
    newChatHistory: ChatHistory
  ) => {
    setListings(newListings);
    setQueryRecord(newQueryRecord);
    setChatHistory(newChatHistory);
  };

  const clear = () => {
    setListings([]);
    setQueryRecord({});
    setChatHistory([] as ChatHistory);
  };

  return (
    <ListingsContext.Provider value={{ listings, queryRecord, chatHistory, setAll, clear }}>
      {children}
    </ListingsContext.Provider>
  );
};

export const useListingsContext = () => {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error("useListingsContext must be used within a ListingsProvider");
  return ctx;
};
