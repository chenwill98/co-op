'use client';

import { getDisplayTag } from '@/app/lib/tagUtils';
import { netEffectivePrice } from '@/app/lib/searchUtils';
import { getRandomLoadingMessage } from '@/app/lib/loadingMessages';
import { formatAmenityName } from './utilities';
import { ArrowUpIcon, ArrowPathIcon, BarsArrowUpIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useListingsContext } from '@/app/context/ListingsContext';
import type { ClaudeResponse } from '@/app/lib/claudeQueryParser';
import Markdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBox() {
  // Use context for shared state
  const { listings, hasSearched, queryRecord, threadId, isThreadIdReady, pendingMessage, sort, setAll, setSort, resetThreadId, setPendingMessage, clear, removeFilter, removeFromArrayFilter } = useListingsContext();

  // Local chat messages for display
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Text input state (sort now lives in context)
  const [textInput, setTextInput] = useState('');
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Suggested queries from conversational responses
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);

  // Loading state with NYC flavor text
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Collapse state for chat
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Keyboard hint visibility (animated enter key indicator)
  const [kbdVisible, setKbdVisible] = useState(false);

  // Summary line state: pulse animation on count change + random empty-state message
  const previousCountRef = useRef<number>(listings.length);
  const [isPulsing, setIsPulsing] = useState(false);
  const [emptyMessage] = useState(
    () => {
      const messages = [
        "No listings match your search criteria",
        "No results found for this search",
        "Nothing found - try adjusting your filters",
        "No matching properties available",
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
  );

  // Trigger pulse animation when count changes
  useEffect(() => {
    if (previousCountRef.current !== listings.length && hasSearched) {
      setIsPulsing(true);
      previousCountRef.current = listings.length;
      const timer = setTimeout(() => setIsPulsing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [listings.length, hasSearched]);

  // Ref to prevent double-processing of pending message
  const processingPendingRef = useRef(false);

  // Ref for auto-scroll to bottom of chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ref for click-outside collapse
  const cardRef = useRef<HTMLDivElement>(null);

  // ThreadId is now initialized in context - no need for useEffect here

  // Rotate loading message every 2 seconds while loading
  useEffect(() => {
    if (!loading) return;

    setLoadingMessage(getRandomLoadingMessage());
    const interval = setInterval(() => {
      setLoadingMessage(getRandomLoadingMessage());
    }, 2000);

    return () => clearInterval(interval);
  }, [loading]);

  // Sort configs
  const sortConfigs = {
    original: { label: 'Order Saved' },
    newest: { label: 'Newest' },
    least_expensive: { label: 'Least Expensive' },
    most_expensive: { label: 'Most Expensive' },
  };

  /**
   * Re-execute the current search with updated filters/sort via the lightweight
   * /api/search endpoint (no AI call). Used for badge removal and sort changes.
   */
  const reExecuteSearch = useCallback(async (
    updatedFilters: ClaudeResponse,
    updatedSort: string
  ) => {
    // If all filters have been removed, reset to the no-search state
    if (Object.keys(updatedFilters).length === 0) {
      clear();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: updatedFilters, sort: updatedSort }),
      });

      if (!res.ok) {
        let errorDetail = 'Failed to refresh listings';
        try {
          const errorData = await res.json();
          errorDetail = errorData.details || errorData.error || errorDetail;
        } catch {
          errorDetail = `Request failed: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorDetail);
      }

      const data = await res.json();
      setAll(
        Array.isArray(data.results) ? data.results : [],
        updatedFilters,
        threadId
      );
      // Only clear pendingRefresh after a successful refresh
      setPendingRefresh(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [threadId, setAll, clear]);

  /**
   * Wrapper for removing an entire filter or a subkey (min/max) from a range filter.
   * Stages the change visually (badge disappears) and sets pendingRefresh — does NOT auto-query.
   * If this removes the last filter, clears everything immediately instead.
   */
  const handleRemoveFilter = useCallback((filterKey: string, subKey?: string) => {
    // Compute what the new filter state would be to check if it's empty
    const newRecord = { ...queryRecord };

    if (!subKey) {
      delete newRecord[filterKey];
    } else {
      const range = newRecord[filterKey] as { min?: number | null; max?: number | null };
      if (range) {
        newRecord[filterKey] = { ...range, [subKey]: null };
        const updated = newRecord[filterKey] as { min?: number | null; max?: number | null };
        if (updated.min == null && updated.max == null) {
          delete newRecord[filterKey];
        }
      }
    }

    if (Object.keys(newRecord).length === 0) {
      // Last filter removed — reset to no-search state immediately
      clear();
      setPendingRefresh(false);
    } else {
      // Stage the removal: update badges via context, flag for deferred refresh
      removeFilter(filterKey, subKey);
      setPendingRefresh(true);
    }
  }, [queryRecord, clear, removeFilter]);

  /**
   * Wrapper for removing a single item from an array filter (e.g., one neighborhood).
   * Stages the change visually and sets pendingRefresh — does NOT auto-query.
   * If this removes the last filter, clears everything immediately instead.
   */
  const handleRemoveFromArrayFilter = useCallback((filterKey: string, itemToRemove: string) => {
    // Compute what the new filter state would be to check if it's empty
    const newRecord = { ...queryRecord };
    const arr = newRecord[filterKey] as string[];
    if (Array.isArray(arr)) {
      const filtered = arr.filter(item => item !== itemToRemove);
      if (filtered.length === 0) {
        delete newRecord[filterKey];
      } else {
        newRecord[filterKey] = filtered;
      }
    }

    if (Object.keys(newRecord).length === 0) {
      clear();
      setPendingRefresh(false);
    } else {
      removeFromArrayFilter(filterKey, itemToRemove);
      setPendingRefresh(true);
    }
  }, [queryRecord, clear, removeFromArrayFilter]);

  const handleSortChange = (option: string) => {
    setSort(option);
    setSortDropdownOpen(false);
    // Stage sort change — only flag for deferred refresh if there are active filters
    if (Object.keys(queryRecord).length > 0) {
      setPendingRefresh(true);
    }
  };

  // Fetch listings using the LangGraph chat API (AI-powered search)
  // freshSearch=true skips sending existing filters (used for suggested query chips)
  const fetchListings = useCallback(async (text: string, freshSearch: boolean = false) => {
    if (!text.trim() || !threadId || !isThreadIdReady) return;

    setLoading(true);
    setIsCollapsed(false);
    setError(null);
    setSuggestedQueries([]);

    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          threadId,
          stream: false,
          existingFilters: freshSearch ? {} : queryRecord,
          sort,
        }),
      });

      if (!res.ok) {
        let errorDetail = 'Failed to fetch listings';
        try {
          const errorData = await res.json();
          errorDetail = errorData.details || errorData.error || errorDetail;
        } catch {
          errorDetail = `Request failed: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorDetail);
      }

      const data = await res.json();

      // Only update listings/filters for search responses
      if (data.responseType !== "conversational") {
        setAll(
          Array.isArray(data.results) ? data.results : [],
          data.searchFilters || {},
          threadId
        );
      }

      // Add assistant message to chat
      if (data.responseMessage) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.responseMessage }]);
      }

      // Store suggested queries for rendering as clickable chips
      if (data.suggestedQueries?.length > 0) {
        setSuggestedQueries(data.suggestedQueries);
      } else {
        setSuggestedQueries([]);
      }

      // Clear the input and any pending refresh (AI search incorporates latest state)
      setTextInput('');
      setPendingRefresh(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  }, [threadId, isThreadIdReady, queryRecord, sort, setAll]);

  // Process pending message from landing page redirect
  useEffect(() => {
    if (pendingMessage && isThreadIdReady && !processingPendingRef.current) {
      processingPendingRef.current = true;
      const message = pendingMessage;
      setPendingMessage(null);
      fetchListings(message);
    }
  }, [pendingMessage, isThreadIdReady, fetchListings, setPendingMessage]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (textInput.trim()) {
        fetchListings(textInput);
      } else if (pendingRefresh) {
        reExecuteSearch(queryRecord, sort);
      }
    }
  };

  // Click outside for dropdown
  useEffect(() => {
    if (!sortDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sortDropdownOpen]);

  // Click outside card to collapse chat
  useEffect(() => {
    if (isCollapsed) return;
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setIsCollapsed(true);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isCollapsed]);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  // Clear chat and start fresh
  const handleClearChat = () => {
    setChatMessages([]);
    setSuggestedQueries([]);
    setPendingRefresh(false);
    processingPendingRef.current = false;
    const newThreadId = resetThreadId();
    setAll([], {}, newThreadId);
  };

  // Animated filter removal — delays state update so exit animation plays first
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());

  const animateRemoveFilter = useCallback((filterKey: string, subKey?: string) => {
    const badgeKey = subKey ? `${filterKey}-${subKey}` : filterKey;
    setRemovingKeys(prev => new Set(prev).add(badgeKey));
    setTimeout(() => {
      handleRemoveFilter(filterKey, subKey);
      setRemovingKeys(prev => { const next = new Set(prev); next.delete(badgeKey); return next; });
    }, 250);
  }, [handleRemoveFilter]);

  const animateRemoveFromArrayFilter = useCallback((filterKey: string, itemToRemove: string) => {
    const badgeKey = `${filterKey}-${itemToRemove}`;
    setRemovingKeys(prev => new Set(prev).add(badgeKey));
    setTimeout(() => {
      handleRemoveFromArrayFilter(filterKey, itemToRemove);
      setRemovingKeys(prev => { const next = new Set(prev); next.delete(badgeKey); return next; });
    }, 250);
  }, [handleRemoveFromArrayFilter]);

  // Badge styling
  const BADGE_CLASS = "badge glass-badge-primary text-primary rounded-full text-xs inline-flex items-center animate-badge-in";
  const badgeClasses = (key: string) =>
    `${BADGE_CLASS} badge-animated${removingKeys.has(key) ? ' badge-removing' : ''}`;

  // Condensed badge renderer — plain function (not a component) to avoid
  // remounting on every parent re-render, which would replay the entry animation.
  const renderCondensedBadge = (filterKey: string, label: string, items: string[], formatted: string[]) => {
    const displayText = formatted.length <= 2
      ? formatted.join(', ')
      : `${formatted.slice(0, 2).join(', ')}, +${formatted.length - 2}`;

    // Only use dropdown wrapper when there are items to expand (>2)
    if (formatted.length <= 2) {
      return (
        <span key={filterKey} className={badgeClasses(filterKey)}>
          {label} • {displayText}
          <XMarkIcon
            onClick={() => animateRemoveFilter(filterKey)}
            className="h-3 w-3 cursor-pointer rounded-full box-content p-0.5 -mx-0.5 hover:bg-base-content/15 transition-colors"
          />
        </span>
      );
    }

    return (
      <div key={filterKey} className={`dropdown dropdown-top dropdown-hover badge-animated${removingKeys.has(filterKey) ? ' badge-removing' : ''}`}>
        <span tabIndex={0} className={BADGE_CLASS}>
          {label} • {displayText}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              animateRemoveFilter(filterKey);
            }}
            className="ml-1"
            type="button"
          >
            <XMarkIcon className="h-3 w-3 cursor-pointer rounded-full box-content p-0.5 -mx-0.5 hover:bg-base-content/15 transition-colors" />
          </button>
        </span>
        <ul tabIndex={0} className="dropdown-content glass-dropdown rounded-box z-[100] p-2 text-xs max-h-48 overflow-y-auto min-w-max">
          {formatted.map((item, idx) => (
            <li key={idx} className="px-2 py-1 hover:bg-base-200 rounded flex items-center justify-between gap-2">
              <span>{item}</span>
              <XMarkIcon
                onClick={() => handleRemoveFromArrayFilter(filterKey, items[idx])}
                className="h-3 w-3 cursor-pointer rounded-full box-content p-0.5 -mx-0.5 hover:bg-base-content/15 transition-colors flex-shrink-0"
              />
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const formatEntry = ([key, val]: [string, unknown]) => {
    if (key === 'id') return [];
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Special handling for neighborhoods - condense into single badge with hover dropdown
    if (key === 'neighborhood' && Array.isArray(val) && val.length > 0) {
      const arr = val as string[];
      const formatted = arr.map(n =>
        n.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      );
      return [renderCondensedBadge(key, label, arr, formatted)];
    }

    // Special handling for tag_list - condense into single badge with hover dropdown
    if (key === 'tag_list' && Array.isArray(val) && val.length > 0) {
      const arr = val as string[];
      const formatted = arr.map(getDisplayTag);
      return [renderCondensedBadge(key, "Tags", arr, formatted)];
    }

    // Arrays (amenities, others) - render each item as individual badge with X
    if (Array.isArray(val)) {
      let arr = val as string[];
      const originalArr = val as string[]; // Keep original for removal
      if (key === 'amenities') arr = arr.map(formatAmenityName);

      return arr.map((item, idx) => {
        const badgeKey = `${key}-${originalArr[idx]}`;
        return (
          <span key={badgeKey} className={badgeClasses(badgeKey)}>
            {label} • {item}
            <XMarkIcon
              onClick={() => animateRemoveFromArrayFilter(key, originalArr[idx])}
              className="h-3 w-3 cursor-pointer rounded-full box-content p-0.5 -mx-0.5 hover:bg-base-content/15 transition-colors"
            />
          </span>
        );
      });
    }

    // Objects with min/max (range)
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const rangeVal = val as { min?: number | null; max?: number | null };
      if ('min' in rangeVal || 'max' in rangeVal) {
        const min = rangeVal.min, max = rangeVal.max;
        if (min != null && max != null && min === max) {
          return [
            <span key={key} className={badgeClasses(key)}>
              {label} • {min}
              <XMarkIcon
                onClick={() => animateRemoveFilter(key)}
                className="h-3 w-3 cursor-pointer rounded-full box-content p-0.5 -mx-0.5 hover:bg-base-content/15 transition-colors"
              />
            </span>
          ];
        }
        return [
          ...(min != null ? [
            <span key={key + '-min'} className={badgeClasses(`${key}-min`)}>
              {`Min ${label} • ${min}`}
              <XMarkIcon
                onClick={() => animateRemoveFilter(key, 'min')}
                className="h-3 w-3 cursor-pointer rounded-full box-content p-0.5 -mx-0.5 hover:bg-base-content/15 transition-colors"
              />
            </span>
          ] : []),
          ...(max != null ? [
            <span key={key + '-max'} className={badgeClasses(`${key}-max`)}>
              {`Max ${label} • ${max}`}
              <XMarkIcon
                onClick={() => animateRemoveFilter(key, 'max')}
                className="h-3 w-3 cursor-pointer rounded-full box-content p-0.5 -mx-0.5 hover:bg-base-content/15 transition-colors"
              />
            </span>
          ] : [])
        ];
      }
      return [];
    }

    // Primitive values
    return [
      <span key={key} className={badgeClasses(key)}>
        {label} • {String(val)}
        <XMarkIcon
          onClick={() => animateRemoveFilter(key)}
          className="h-3 w-3 cursor-pointer rounded-full box-content p-0.5 -mx-0.5 hover:bg-base-content/15 transition-colors"
        />
      </span>
    ];
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-transparent pointer-events-none">
      <div className="container mx-auto pointer-events-auto w-full px-4 md:w-2/3 lg:w-3/5 max-w-3xl">
        <div className="flex flex-row">
          <div className="flex-grow p-4">
            <div ref={cardRef} className="card bg-base-100/80 backdrop-blur-lg rounded-4xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.08)] mx-auto">
              <div className="card-body p-3">
                <div className="flex flex-col">
                  {/* Summary line - visible after search */}
                  {hasSearched && (
                    <div className="flex items-center justify-center gap-2 text-sm px-1 pt-1">
                      {listings.length > 0 ? (
                        <>
                          <span className={`font-semibold text-primary ${isPulsing ? 'animate-count-pulse' : ''}`}>
                            {listings.length} {listings.length === 1 ? 'Property' : 'Properties'}
                          </span>
                          <span className="text-base-content/40">&middot;</span>
                          <span className="text-base-content/60">
                            ${Math.min(...listings.map(l => netEffectivePrice(l))).toLocaleString()} &ndash; ${Math.max(...listings.map(l => netEffectivePrice(l))).toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-primary/60">
                          {emptyMessage}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Divider between summary and filters */}
                  {hasSearched && Object.entries(queryRecord).length > 0 && (
                    <div className="border-t border-base-300/50 mx-1 my-1" />
                  )}

                  {/* Filter badges - ALWAYS visible */}
                  {Object.entries(queryRecord).length > 0 && (
                    <div className="flex flex-row flex-wrap gap-1 p-1 pb-2">
                      {Object.entries(queryRecord).flatMap(formatEntry)}
                      {/* Clear button */}
                      <button
                        onClick={handleClearChat}
                        className="badge text-xs cursor-pointer bg-base-300/40 border border-base-300/50 backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.04)] hover:bg-base-300/60 rounded-full"
                        title="Clear chat and filters"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {/* Collapsible section with animation - only chat messages, error, loading */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isCollapsed
                        ? 'opacity-0 max-h-0 overflow-hidden'
                        : `opacity-100 max-h-[calc(100vh-12rem)] ${isExpanded ? 'overflow-visible' : 'overflow-hidden'}`
                    }`}
                    onTransitionEnd={() => {
                      if (!isCollapsed) setIsExpanded(true);
                    }}
                  >
                    {/* Error display */}
                    {error && (
                      <div className="alert alert-error text-sm py-2">
                        {error}
                      </div>
                    )}

                    {/* Chat messages */}
                    {chatMessages.length > 0 && (
                      <div
                        className="flex flex-col gap-2 py-2 pt-4 max-h-[calc(100vh-15rem)] overflow-y-auto"
                        style={{
                          maskImage: 'linear-gradient(to bottom, transparent 0%, black 16px)',
                          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 16px)',
                        }}
                      >
                        {chatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
                          >
                            <div
                              className={`chat-bubble ${msg.role === 'user' ? 'glass-chat-user' : 'glass-chat-assistant'}`}
                            >
                              {msg.role === 'assistant' ? (
                                <div className="chat-markdown prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold">
                                  <Markdown>{msg.content}</Markdown>
                                </div>
                              ) : (
                                msg.content
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Suggested query chips */}
                        {suggestedQueries.length > 0 && !loading && (
                          <div className="flex flex-wrap gap-2 px-2 py-1">
                            {suggestedQueries.map((query, idx) => (
                              <button
                                key={idx}
                                className="badge glass-badge-primary cursor-pointer hover:brightness-[0.82] active:scale-95 text-xs py-3 px-4 rounded-full transition-all duration-150"
                                onClick={() => {
                                  setSuggestedQueries([]);
                                  fetchListings(query, true);
                                }}
                              >
                                {query}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Loading indicator with NYC flavor */}
                        {loading && (
                          <div className="chat chat-start">
                            <div className="chat-bubble glass-chat-assistant flex items-center gap-2">
                              <span className="loading loading-spinner loading-sm"></span>
                              <span className="text-sm italic">{loadingMessage}</span>
                            </div>
                          </div>
                        )}

                        {/* Scroll anchor for auto-scroll */}
                        <div ref={chatEndRef} />
                      </div>
                    )}

                    {/* Show loading even without messages */}
                    {loading && chatMessages.length === 0 && (
                      <div className="flex items-center gap-2 py-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        <span className="text-sm italic text-base-content/70">{loadingMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Input area */}
                  <div className="flex flex-row items-center relative gap-2">
                    <label className="flex items-center gap-2 w-full h-10 px-3 bg-base-200/30 rounded-full cursor-text transition-all duration-200 group/input">
                      <MagnifyingGlassIcon className="h-5 w-5 opacity-50 group-focus-within/input:opacity-70 group-focus-within/input:text-primary transition-all duration-200" />
                      <input
                        type="text"
                        placeholder="Search for apartments..."
                        className="unstyled bg-transparent grow text-sm text-base-content caret-primary placeholder:text-base-content/50 focus:outline-none focus:ring-0"
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        onFocus={() => {
                          setIsCollapsed(false);
                          setTimeout(() => setKbdVisible(true), 50);
                        }}
                        onBlur={() => setKbdVisible(false)}
                        disabled={loading}
                      />
                      <kbd className={`kbd kbd-sm transition-all duration-300 ease-in ${kbdVisible ? 'opacity-70 scale-100' : 'opacity-0 scale-95'}`}>enter</kbd>
                    </label>

                    {/* Sort Dropdown */}
                    <div className="dropdown dropdown-top dropdown-end">
                      <label tabIndex={0} className="btn btn-circle p-2">
                        <BarsArrowUpIcon className="h-5 w-5" />
                      </label>
                      <ul tabIndex={0} className="dropdown-content menu glass-dropdown rounded-box z-[100] w-52 p-2">
                        {Object.entries(sortConfigs).map(([key, config]) => (
                          <li key={key} className={sort === key ? 'bg-primary/15 rounded-lg font-medium text-primary' : ''}>
                            <a onClick={() => handleSortChange(key)}>{config.label}</a>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Submit / Refresh button */}
                    <button
                      className={`btn btn-circle p-2 ${pendingRefresh && !textInput.trim() ? 'btn-accent' : 'btn-primary'}`}
                      onClick={() => {
                        if (textInput.trim()) {
                          fetchListings(textInput);
                        } else if (pendingRefresh) {
                          reExecuteSearch(queryRecord, sort);
                        }
                      }}
                      type="button"
                      disabled={loading || !isThreadIdReady || (!textInput.trim() && !pendingRefresh)}
                    >
                      {pendingRefresh && !textInput.trim() ? (
                        <ArrowPathIcon className="h-5 w-5" />
                      ) : (
                        <ArrowUpIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
