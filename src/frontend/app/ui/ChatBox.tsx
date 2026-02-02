'use client';

import { getDisplayTag } from '@/app/lib/tagUtils';
import { getRandomLoadingMessage } from '@/app/lib/loadingMessages';
import { formatAmenityName } from './utilities';
import { ArrowUpIcon, BarsArrowUpIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useListingsContext } from '@/app/context/ListingsContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBox() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Use context for shared state
  const { queryRecord, threadId, isThreadIdReady, pendingMessage, setAll, resetThreadId, setPendingMessage, removeFilter, removeFromArrayFilter } = useListingsContext();

  // Local chat messages for display
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Filters state
  const [filters, setFilters] = useState({
    text: searchParams.get('text') || '',
    sort: searchParams.get('sort') || 'original',
  });
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Loading state with NYC flavor text
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Collapse state for chat
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Ref to prevent double-processing of pending message
  const processingPendingRef = useRef(false);

  // Ref for auto-scroll to bottom of chat
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setFilters({
      text: searchParams.get('text') || '',
      sort: searchParams.get('sort') || 'original',
    });
  }, [searchParams]);

  // Sort configs
  const sortConfigs = {
    original: { label: 'Order Saved' },
    newest: { label: 'Newest' },
    least_expensive: { label: 'Least Expensive' },
    most_expensive: { label: 'Most Expensive' },
  };

  const handleInputChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSortChange = (option: string) => {
    setFilters(prev => ({ ...prev, sort: option }));
    setSortDropdownOpen(false);
    applyFilters({ ...filters, sort: option });
  };

  const applyFilters = (customFilters?: typeof filters) => {
    const f = customFilters || filters;
    const params = new URLSearchParams();
    if (f.text) params.set('text', f.text);
    if (f.sort && f.sort !== 'original') params.set('sort', f.sort);
    replace(`${pathname}?${params.toString()}`);
  };

  // Fetch listings using the new LangGraph chat API
  const fetchListings = useCallback(async (text: string) => {
    if (!text.trim() || !threadId || !isThreadIdReady) return;

    setLoading(true);
    setError(null);

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
          existingFilters: queryRecord,
        }),
      });

      if (!res.ok) {
        // Try to extract detailed error from response
        let errorDetail = 'Failed to fetch listings';
        try {
          const errorData = await res.json();
          errorDetail = errorData.details || errorData.error || errorDetail;
        } catch {
          // If response isn't JSON, use status text
          errorDetail = `Request failed: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorDetail);
      }

      const data = await res.json();

      // Update context with results
      setAll(
        Array.isArray(data.results) ? data.results : [],
        data.searchFilters || {},
        threadId
      );

      // Add assistant message to chat
      if (data.responseMessage) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.responseMessage }]);
      }

      // Clear the input
      setFilters(prev => ({ ...prev, text: '' }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  }, [threadId, isThreadIdReady, queryRecord, setAll]);

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
      fetchListings(filters.text);
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

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  // Clear chat and start fresh
  const handleClearChat = () => {
    setChatMessages([]);
    processingPendingRef.current = false;
    const newThreadId = resetThreadId();
    setAll([], {}, newThreadId);
  };

  // Badge styling
  const BADGE_CLASS = "badge glass-badge-primary text-primary rounded-full text-xs inline-flex items-center";

  // Condensed badge with hover dropdown for arrays with many items
  const CondensedBadge = ({ filterKey, label, items, formatted }: {
    filterKey: string;
    label: string;
    items: string[];
    formatted: string[];
  }) => {
    let displayText: string;
    if (formatted.length <= 2) {
      displayText = formatted.join(', ');
    } else {
      displayText = `${formatted.slice(0, 2).join(', ')}, +${formatted.length - 2}`;
    }

    return (
      <div className="dropdown dropdown-top dropdown-hover">
        <span tabIndex={0} className={BADGE_CLASS}>
          {label} • {displayText}
          <XMarkIcon
            onClick={(e) => {
              e.stopPropagation();
              removeFilter(filterKey);
            }}
            className="h-3 w-3 cursor-pointer hover:text-error"
          />
        </span>
        {formatted.length > 2 && (
          <ul tabIndex={0} className="dropdown-content glass-dropdown rounded-box z-[100] p-2 text-xs max-h-48 overflow-y-auto min-w-max">
            {formatted.map((item, idx) => (
              <li key={idx} className="px-2 py-1 hover:bg-base-200 rounded flex items-center justify-between gap-2">
                <span>{item}</span>
                <XMarkIcon
                  onClick={() => removeFromArrayFilter(filterKey, items[idx])}
                  className="h-3 w-3 cursor-pointer hover:text-error flex-shrink-0"
                />
              </li>
            ))}
          </ul>
        )}
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
      return [<CondensedBadge key={key} filterKey={key} label={label} items={arr} formatted={formatted} />];
    }

    // Special handling for tag_list - condense into single badge with hover dropdown
    if (key === 'tag_list' && Array.isArray(val) && val.length > 0) {
      const arr = val as string[];
      const formatted = arr.map(getDisplayTag);
      return [<CondensedBadge key={key} filterKey={key} label="Tags" items={arr} formatted={formatted} />];
    }

    // Arrays (amenities, others) - render each item as individual badge with X
    if (Array.isArray(val)) {
      let arr = val as string[];
      const originalArr = val as string[]; // Keep original for removal
      if (key === 'amenities') arr = arr.map(formatAmenityName);

      return arr.map((item, idx) => (
        <span key={`${key}-${idx}`} className={BADGE_CLASS}>
          {label} • {item}
          <XMarkIcon
            onClick={() => removeFromArrayFilter(key, originalArr[idx])}
            className="h-3 w-3 cursor-pointer hover:text-error"
          />
        </span>
      ));
    }

    // Objects with min/max (range)
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const rangeVal = val as { min?: number | null; max?: number | null };
      if ('min' in rangeVal || 'max' in rangeVal) {
        const min = rangeVal.min, max = rangeVal.max;
        if (min != null && max != null && min === max) {
          return [
            <span key={key} className={BADGE_CLASS}>
              {label} • {min}
              <XMarkIcon
                onClick={() => removeFilter(key)}
                className="h-3 w-3 cursor-pointer hover:text-error"
              />
            </span>
          ];
        }
        return [
          ...(min != null ? [
            <span key={key + '-min'} className={BADGE_CLASS}>
              {`Min ${label} • ${min}`}
              <XMarkIcon
                onClick={() => removeFilter(key, 'min')}
                className="h-3 w-3 cursor-pointer hover:text-error"
              />
            </span>
          ] : []),
          ...(max != null ? [
            <span key={key + '-max'} className={BADGE_CLASS}>
              {`Max ${label} • ${max}`}
              <XMarkIcon
                onClick={() => removeFilter(key, 'max')}
                className="h-3 w-3 cursor-pointer hover:text-error"
              />
            </span>
          ] : [])
        ];
      }
      return [];
    }

    // Primitive values
    return [
      <span key={key} className={BADGE_CLASS}>
        {label} • {String(val)}
        <XMarkIcon
          onClick={() => removeFilter(key)}
          className="h-3 w-3 cursor-pointer hover:text-error"
        />
      </span>
    ];
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-transparent pointer-events-none">
      <div className="container mx-auto pointer-events-auto w-full px-4 md:w-5/6 lg:w-5/7">
        <div className="flex flex-row">
          <div className="flex-grow p-4">
            <div className="card bg-base-100/80 backdrop-blur-lg rounded-4xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] mx-auto">
              <div className="card-body p-3">
                <div className="flex flex-col">
                  {/* Filter badges - ALWAYS visible */}
                  {Object.entries(queryRecord).length > 0 && (
                    <div className="flex flex-row flex-wrap gap-1 p-1">
                      {Object.entries(queryRecord).flatMap(formatEntry)}
                      {/* Clear button */}
                      <button
                        onClick={handleClearChat}
                        className="badge badge-ghost text-xs cursor-pointer hover:bg-base-200"
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
                        : 'opacity-100 max-h-96 overflow-visible'
                    }`}
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
                        className="flex flex-col gap-2 py-2 pt-4 max-h-48 overflow-y-auto"
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
                              className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}

                        {/* Loading indicator with NYC flavor */}
                        {loading && (
                          <div className="chat chat-start">
                            <div className="chat-bubble chat-bubble-secondary flex items-center gap-2">
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
                  <div className="flex flex-row items-center relative">
                    <input
                      type="text"
                      placeholder="Search for apartments... (e.g., '2br in Chelsea under $4000')"
                      className="input input-ghost chat-input w-full bg-transparent border border-transparent focus:bg-transparent focus:border-transparent focus:outline-none focus:shadow-none focus-visible:outline-none focus-visible:shadow-none text-sm placeholder:text-base-content/50 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-40"
                      value={filters.text}
                      onChange={e => handleInputChange('text', e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      disabled={loading}
                    />

                    {/* Collapse toggle button */}
                    <button
                      className="btn btn-circle btn-ghost btn-sm mr-1"
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      title={isCollapsed ? "Expand chat" : "Collapse chat"}
                    >
                      {isCollapsed ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                    </button>

                    {/* Sort Dropdown */}
                    <div className="dropdown dropdown-top dropdown-end">
                      <label tabIndex={0} className="btn btn-circle p-2 mr-2">
                        <BarsArrowUpIcon className="h-5 w-5" />
                      </label>
                      <ul tabIndex={0} className="dropdown-content menu glass-dropdown rounded-box z-[100] w-52 p-2">
                        {Object.entries(sortConfigs).map(([key, config]) => (
                          <li key={key} className={filters.sort === key ? 'bg-primary/20 rounded-lg border-l-2 border-primary font-medium' : ''}>
                            <a onClick={() => handleSortChange(key)}>{config.label}</a>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Submit button */}
                    <button
                      className="btn btn-primary btn-circle p-2"
                      onClick={() => fetchListings(filters.text)}
                      type="button"
                      disabled={loading || !filters.text.trim() || !isThreadIdReady}
                    >
                      <ArrowUpIcon className="h-5 w-5" />
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
