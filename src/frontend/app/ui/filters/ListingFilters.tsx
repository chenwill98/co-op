'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import TagsFilter from './TagsFilter';

type SortOrder = 'none' | 'asc' | 'desc';

interface ListingFiltersProps {
    sortOrder: SortOrder;
    onSortChange: (order: SortOrder) => void;
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
}

export default function ListingFilters({ sortOrder, onSortChange, selectedTags, setSelectedTags }: ListingFiltersProps) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const [filters, setFilters] = useState({
        text: searchParams.get('text') || '',
        neighborhood: searchParams.get('neighborhood') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        brokerFee: searchParams.get('brokerFee') || 'Any'
    });

    const handleInputChange = (field: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const toggleSort = () => {
        const newSort: SortOrder = sortOrder === 'none' ? 'asc' : 
                                 sortOrder === 'asc' ? 'desc' : 'none';
        onSortChange(newSort);
    };

    const applyFilters = () => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== 'Any') {
                params.set(key, value);
            }
        });
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="card-bordered border-primary bg-base-100 shadow-lg sticky top-20 p-6 m-4 h-fit">
            <div className="flex flex-col gap-4">
                <div className="col-span-1">
                    <label className="label">
                        <span className="label-text text-gray-400">Search</span>
                    </label>
                    <input
                        type="text"
                        id="search"
                        placeholder="Search listings..."
                        className="input input-bordered w-full"
                        value={filters.text}
                        onChange={(e) => handleInputChange('text', e.target.value)}
                    />
                </div>
                {/* Neighborhood */}
                <div className="col-span-1">
                  <label className="label">
                    <span className="label-text text-gray-400">Neighborhood</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Brooklyn" 
                    className="input input-bordered w-full" 
                    value={filters.neighborhood}
                  onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                  />
                </div>

                {/* Price Range */}
                <div className="col-span-1">
                  <label className="label">
                    <span className="label-text text-gray-400">Price Range</span>
                  </label>
                  <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Min"
                            className="input input-bordered w-full"
                            step="100" 
                            min="0"
                            value={filters.minPrice}
                            onChange={(e) => handleInputChange('minPrice', e.target.value)}
                        />
                        <input
                            type="number"
                            placeholder="Max"
                            className="input input-bordered w-full"
                            step="100" 
                            min="0"
                            value={filters.maxPrice}
                            onChange={(e) => handleInputChange('maxPrice', e.target.value)}
                        />
                    </div>
                </div>

                {/* Broker Fee */}
                <div className="col-span-1">
                  <label className="label">
                    <span className="label-text text-gray-400">Broker Fee</span>
                  </label>
                  <select
                        className="select select-bordered w-full"
                        value={filters.brokerFee}
                        onChange={(e) => handleInputChange('brokerFee', e.target.value)}
                    >
                        <option>Any</option>
                        <option>No Fee</option>
                        <option>Low Fee (Less than 10%)</option>
                    </select>
                </div>

                {/* Tags Filter */}
                <div className="col-span-1">
                    <label className="label">
                        <span className="label-text text-gray-400">Tags</span>
                    </label>
                    <TagsFilter selectedTags={selectedTags} setSelectedTags={setSelectedTags} />
                </div>

                {/* Sort Toggle Button */}
                <div className="col-span-1">
                    <button
                        onClick={toggleSort}
                        className={`btn btn-outline w-full ${sortOrder !== 'none' ? 'btn-primary' : ''}`}
                    >
                        Price Sort: {sortOrder === 'none' ? 'None' : 
                                   sortOrder === 'asc' ? '↑ Low to High' : '↓ High to Low'}
                    </button>
                </div>

                {/* Apply Filters Button */}
                <button
                    onClick={applyFilters}
                    className="btn btn-primary"
                >
                    Apply Filters
                </button>
            </div>
        </div>
    );
}