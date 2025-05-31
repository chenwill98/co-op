'use client';

import type { ChatHistory } from '@/app/lib/definitions';
import { getDisplayTag } from '@/app/lib/tagUtils';
import { formatAmenityName } from './utilities';
import { ArrowUpIcon, BarsArrowUpIcon } from '@heroicons/react/24/outline';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useListingsContext } from '@/app/context/ListingsContext';

export default function ChatBox() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Use context for all shared state
  const { listings, queryRecord, chatHistory, setAll } = useListingsContext();

  // Filters state, minimal for demo (add more as needed)
  const [filters, setFilters] = useState({
    text: searchParams.get('text') || '',
    sort: searchParams.get('sort') || 'original',
  });
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilters({
      text: searchParams.get('text') || '',
      sort: searchParams.get('sort') || 'original',
    });
  }, [searchParams]);

  // Minimal sort configs (add more as needed)
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
    // Optionally auto-apply sort on change:
    applyFilters({ ...filters, sort: option });
  };

  const applyFilters = (customFilters?: typeof filters) => {
    const f = customFilters || filters;
    const params = new URLSearchParams();
    if (f.text) params.set('text', f.text);
    if (f.sort && f.sort !== 'original') params.set('sort', f.sort);
    replace(`${pathname}?${params.toString()}`);
  };

  // Handle Enter key for search
  // Loading/error state for chat submissions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[ChatBox] Current chatHistory:', chatHistory);
  }, [chatHistory]);

  // POST to /api/properties and update context
  const fetchListings = async (text: string) => {
    setLoading(true);
    setError(null);

    // Add the user's input to chatHistory (no tool field)
    chatHistory.push(
      {
        role: "user",
        message: text
      }
    );
    console.log('[ChatBox] Sending chatHistory:', chatHistory);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, chatHistory }),
      });
      if (!res.ok) throw new Error('Failed to fetch listings');
      const { properties, queryRecord, chatHistory: newChatHistory } = await res.json();
      console.log('[ChatBox] Received chatHistory:', newChatHistory);
      setAll(Array.isArray(properties) ? properties : [], queryRecord, newChatHistory);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') fetchListings(filters.text);
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

  // Helper to format each field entry, with exceptions
  const BADGE_CLASS = "badge bg-primary/10 text-primary rounded-full text-xs inline-flex items-center";

  const formatEntry = ([key, val]: [string, any]) => {
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
      const keys = Object.keys(val);
      if (keys.some(k => k === 'min' || k === 'max')) {
        const min = val.min, max = val.max;
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
    // This outer div is fixed and viewport-wide, but transparent and non-interactive by default.
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-transparent pointer-events-none">
      {/* This inner div centers content matching the page's container and re-enables pointer events. */}
      <div className="container mx-auto pointer-events-auto w-5/7">
        <div className="flex flex-row">
          {/* Spacer to account for the sidebar width (ListingFilters) */}
          {/* Adjust 'min-w-72 max-w-72' if your sidebar width changes */}
          {/* <div className="min-w-72 max-w-72 flex-shrink-0"></div> */}
          {/* The actual chatbox content area, takes remaining width */}
          <div className="flex-grow p-4">
            <div className="card bg-base-100 border border-base-content/10 rounded-4xl shadow-lg mx-auto">
              <div className="card-body p-3">
                <div className="flex flex-col">
                  {Object.entries(queryRecord).length > 0 && (
                <div className="flex flex-row flex-wrap gap-1 p-1">
                  {Object.entries(queryRecord).flatMap(formatEntry)}
                </div>
              )}
              {/* Chat bubbles for chat history */}
              {Array.isArray(chatHistory) && chatHistory.length > 0 && (
                <div className="flex flex-col gap-2 py-2">
                  {chatHistory.map((msg: any, idx: number) => {
                    let bubbleContent = '';
                    if (msg.role === 'user') {
                      bubbleContent = msg.message;
                    } else if (msg.role === 'assistant') {
                      bubbleContent = msg.message && msg.message.trim()
                        ? msg.message
                        : (msg.tool && msg.tool !== '{}' ? `Parameters: ${msg.tool}` : '');
                    }
                    return (
                      bubbleContent && (
                        <div
                          key={idx}
                          className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
                        >
                          <div
                            className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}
                          >
                            {bubbleContent}
                          </div>
                        </div>
                      )
                    );
                  })}
                </div>

              )}
                  <div className="flex flex-row items-center relative">
                    <input
                      type="text"
                      placeholder="Refine your search..."
                      className="input input-ghost w-full focus:outline-none"
                      value={filters.text}
                      onChange={e => handleInputChange('text', e.target.value)}
                      onKeyDown={handleInputKeyDown}
                    />
                    {/* Sort Dropdown (DaisyUI native) */}
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
                    {/* Apply Filters */}
                    <button
                      className="btn btn-primary btn-circle p-2"
                      onClick={() => fetchListings(filters.text)}
                      type="button"
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
