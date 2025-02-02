import { Property } from '@/app/lib/definitions';
import { useMemo } from 'react';
import { SortOrder } from '@/app/lib/definitions';
import ListingsSummaryCard from './ListingsSummaryCard';
import { HomeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import BookmarkIcon from '@/app/ui/icons/BookmarkIcon';

export default function ListingsGrid({ listings, listingDetails, listingTags, sortOrder, selectedTags }: { listings: Property[], listingDetails: Record<string, any>, listingTags: Record<string, any>, sortOrder: SortOrder, selectedTags: string[] }) {
    const filteredListings = useMemo(() => {
        if (selectedTags.length === 0) return listings;

        return listings.filter(property => {
            const tags = listingTags[property.id]?.tags || [];
            return selectedTags.every(tag => tags.includes(tag));
        });
    }, [listings, listingTags, selectedTags]);

    const sortedListings = useMemo(() => {
        if (!sortOrder || sortOrder === 'none') return filteredListings;
        return [...filteredListings].sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.price - b.price;
            } else {
                return b.price - a.price;
            }
        });
    }, [filteredListings, sortOrder]);

    return (
        <div className="grid grid-cols-3 gap-3 p-4">
            <ListingsSummaryCard listings={sortedListings} sortOrder={sortOrder} />
            {sortedListings.map((property: Property) => (
                <div key={property.id} className="group card-bordered border-primary bg-base-100 hover:bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <figure className="h-2/5 overflow-hidden">
                        <img
                            src={listingDetails[property.id]?.images[0]}
                            alt={property.address}
                            className="thumbnail object-cover w-full h-full outline outline-1 outline-primary transform transition-transform duration-300 group-hover:scale-105 z-0"
                        />
                    </figure>
                    <div className="card-body h-3/5 flex flex-col">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0">
                                <p className="text-gray-500 text-xs">Rental unit in {property.neighborhood}</p>
                                <Link href={`/listings/${property.id}`}>
                                        <h2 className="hover:text-primary transition-colors">{property.address}</h2>
                                </Link>
                                <div className="text-gray-500 text-sm">{property.bedrooms} {property.bedrooms === 1 ? 'bed' : 'beds'} | {property.bathrooms} {property.bathrooms === 1 ? 'bath' : 'baths'} | {property.sqft === null ? 'N/A' : property.sqft} ft<sup>2</sup></div>
                            </div>
                            <BookmarkIcon/>
                        </div>
                        <div className="flex flex-col gap-0 border-t pt-1">
                            <div className="flex flex-row items-center gap-2">
                                <div className="text-2xl font-bold">${property.price.toLocaleString()}</div>
                                <div className="badge bg-primary rounded-full text-white">{property.no_fee ? 'No Fee' : `Fees: ~$${property.price * 0.15}`}</div>
                            </div>  
                            {!property.no_fee && (
                                <div className="text-lg font-semibold">
                                    ${(property.price - (property.price * 0.15)).toLocaleString()} 
                                    <span className="text-gray-500 text-sm"> net effective rent</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col mt-auto gap-2">
                            <div className="flex flex-wrap gap-1">
                                {(listingTags[property.id]?.tags || []).map((tag: string) => (
                                <div key={tag} className="badge badge-primary rounded-full badge-outline text-xs">
                                    {tag}
                                </div>
                                ))}
                            </div>
                            <div className='text-xs text-gray-500'>Listing on StreetEasy</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}