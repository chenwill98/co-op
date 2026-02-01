'use client';

import { getDisplayTag } from '@/app/lib/tagUtils';
import { getRandomLoadingMessage } from '@/app/lib/loadingMessages';
import { formatAmenityName } from './utilities';
import { ArrowUpIcon, BarsArrowUpIcon } from '@heroicons/react/24/outline';
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
  const { queryRecord, threadId, setAll, setThreadId } = useListingsContext();

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

  // Initialize thread ID on mount
  useEffect(() => {
    if (!threadId) {
      // Check localStorage first
      const storedThreadId = localStorage.getItem('chatThreadId');
      if (storedThreadId) {
        setThreadId(storedThreadId);
      } else {
        // Generate new thread ID
        const newThreadId = `thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('chatThreadId', newThreadId);
        setThreadId(newThreadId);
      }
    }
  }, [threadId, setThreadId]);

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
    if (!text.trim() || !threadId) return;

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
        throw new Error('Failed to fetch listings');
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
  }, [threadId, queryRecord, setAll]);

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

  // Clear chat and start fresh
  const handleClearChat = () => {
    setChatMessages([]);
    const newThreadId = `thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('chatThreadId', newThreadId);
    setThreadId(newThreadId);
    setAll([], {}, newThreadId);
  };

  // Badge styling
  const BADGE_CLASS = "badge bg-primary/10 text-primary rounded-full text-xs inline-flex items-center";

  const formatEntry = ([key, val]: [string, unknown]) => {
    if (key === 'id') return [];
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Arrays (amenities, tag_list, others)
    if (Array.isArray(val)) {
      let arr = val as string[];
      if (key === 'amenities') arr = arr.map(formatAmenityName);
      if (key === 'tag_list') arr = arr.map(getDisplayTag);

      if (arr.length > 3) {
        const remainingArr = arr.slice(1);
        return [
          <div key={key} className="dropdown dropdown-hover dropdown-top dropdown-end inline-block border border-base-content/10">
            <label tabIndex={0} className={BADGE_CLASS + " cursor-pointer"}>
              {label} • {arr[0]}
              <span className="cursor-help text-primary">+{arr.length - 1}</span>
            </label>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box text-xs mt-1 min-w-max border border-base-content/10">
              {remainingArr.map((item, idx) => (
                <li key={idx + 1} className="whitespace-nowrap">{item}</li>
              ))}
            </ul>
          </div>
        ];
      }
      return [
        <span key={key} className={BADGE_CLASS}>
          {label} • {arr.join(', ')}
        </span>
      ];
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
            </span>
          ];
        }
        return [
          ...(min != null ? [<span key={key + '-min'} className={BADGE_CLASS}>{`Min ${label} • ${min}`}</span>] : []),
          ...(max != null ? [<span key={key + '-max'} className={BADGE_CLASS}>{`Max ${label} • ${max}`}</span>] : [])
        ];
      }
      return [];
    }

    // Primitive values
    return [
      <span key={key} className={BADGE_CLASS}>
        {label} • {String(val)}
      </span>
    ];
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-transparent pointer-events-none">
      <div className="container mx-auto pointer-events-auto w-5/7">
        <div className="flex flex-row">
          <div className="flex-grow p-4">
            <div className="card bg-base-100 border border-base-content/10 rounded-4xl shadow-lg mx-auto">
              <div className="card-body p-3">
                <div className="flex flex-col">
                  {/* Filter badges */}
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

                  {/* Error display */}
                  {error && (
                    <div className="alert alert-error text-sm py-2">
                      {error}
                    </div>
                  )}

                  {/* Chat messages */}
                  {chatMessages.length > 0 && (
                    <div className="flex flex-col gap-2 py-2 max-h-48 overflow-y-auto">
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
                    </div>
                  )}

                  {/* Show loading even without messages */}
                  {loading && chatMessages.length === 0 && (
                    <div className="flex items-center gap-2 py-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      <span className="text-sm italic text-base-content/70">{loadingMessage}</span>
                    </div>
                  )}

                  {/* Input area */}
                  <div className="flex flex-row items-center relative">
                    <input
                      type="text"
                      placeholder="Search for apartments... (e.g., '2br in Chelsea under $4000')"
                      className="input input-ghost w-full focus:outline-none"
                      value={filters.text}
                      onChange={e => handleInputChange('text', e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      disabled={loading}
                    />

                    {/* Sort Dropdown */}
                    <div className="dropdown dropdown-top dropdown-end">
                      <label tabIndex={0} className="btn btn-circle p-2 mr-2">
                        <BarsArrowUpIcon className="h-5 w-5" />
                      </label>
                      <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[100] w-52 p-2 shadow-md border border-base-content/10">
                        {Object.entries(sortConfigs).map(([key, config]) => (
                          <li key={key} className={filters.sort === key ? 'bg-primary/10 rounded-lg' : ''}>
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
                      disabled={loading || !filters.text.trim()}
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
