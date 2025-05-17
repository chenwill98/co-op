'use client';

import { getDisplayTag } from '@/app/lib/tagUtils';
import { formatAmenityName } from './utilities';
import { ArrowUpIcon, BarsArrowUpIcon } from '@heroicons/react/24/outline';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export default function ChatBox({ queryRecord }: { queryRecord: Record<string, any> }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

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
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applyFilters();
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
                      onClick={() => applyFilters()}
                      type="button"
                    >
                      <ArrowUpIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Future chat messages could go here */}
            {/* <div className="mt-2 text-xs text-base-content/60">
              <p>AI chat placeholder. Actual chat functionality to be implemented.</p>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
