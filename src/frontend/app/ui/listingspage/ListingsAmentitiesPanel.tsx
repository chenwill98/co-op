'use client';

import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { TagList, formatAmenityName } from "@/app/ui/utilities";
import { useState } from "react";
import ExpandButton from "@/app/ui/icons/ExpandButton";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import TooltipIcon from "@/app/ui/icons/TooltipIcon";
import PercentileCards from "@/app/ui/analytics/PercentileCards";


export default function ListingsAmentitiesPanel({ listingDetails }: { listingDetails: CombinedPropertyDetails }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };

    // Primary amenities to be displayed prominently
    const hasDoorman = listingDetails.amenities?.includes('doorman') || 
                      listingDetails.amenities?.includes('full_time_doorman') || 
                      listingDetails.amenities?.includes('part_time_doorman') ||
                      listingDetails.amenities?.includes('virtual_doorman');
                      
    const hasElevator = listingDetails.amenities?.includes('elevator');
    const hasDishwasher = listingDetails.amenities?.includes('dishwasher');
    
    // Laundry situation
    const hasInUnitLaundry = listingDetails.amenities?.includes('washer_dryer');
    const hasBuildingLaundry = listingDetails.amenities?.includes('laundry');
    
    // Key amenities that are already displayed in the main section
    const keyAmenities = [
        'doorman', 'full_time_doorman', 'part_time_doorman', 'virtual_doorman',
        'elevator', 'dishwasher', 'washer_dryer', 'laundry'
    ];
    
    // Notable amenities that should be highlighted
    const notableAmenities = [
        'gym', 'pool', 'roofdeck', 'private_roof_deck', 'balcony', 'terrace',
        'central_ac', 'parking', 'garage', 'bike_room', 'storage', 'pets',
        'dogs', 'cats', 'hardwood_floors', 'fireplace', 'outdoor_space',
        'concierge', 'live_in_super', 'childrens_playroom', 'wheelchair_access'
    ];
    
    // Get available amenities from a list, excluding key amenities
    const getAvailableAmenities = (amenityList: string[]) => {
        return amenityList.filter(amenity => 
            listingDetails.amenities?.includes(amenity) && 
            !keyAmenities.includes(amenity)
        );
    };

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-base-content">
                Amenities
            </h2>
            <div className="flex flex-row items-center gap-2">
                <h3 className="text-lg font-semibold text-base-content/80">
                    Key Amenities
                </h3>
                <TooltipIcon tooltipText="Key amenities are the most important features of a property that are typically highlighted in the description summary." />
            </div>
            <div className="flex flex-wrap gap-1">
                <TagList category="Amenities" tags={listingDetails.tag_list || []} />
            </div>
            {/* Primary amenities */}
            <div className="grid grid-cols-4 gap-4 mt-2">
                <AmenityCard 
                    title="Elevator" 
                    available={hasElevator} 
                />
                <AmenityCard 
                    title="Doorman" 
                    available={hasDoorman} 
                    details={
                        listingDetails.amenities?.includes('full_time_doorman') 
                            ? 'Full-time' 
                            : listingDetails.amenities?.includes('part_time_doorman')
                                ? 'Part-time'
                                : listingDetails.amenities?.includes('virtual_doorman')
                                    ? 'Virtual'
                                    : undefined
                    }
                />
                <AmenityCard 
                    title="Dishwasher" 
                    available={hasDishwasher} 
                />
                <AmenityCard 
                    title="Laundry" 
                    available={hasInUnitLaundry || hasBuildingLaundry} 
                    details={hasInUnitLaundry ? 'In-unit' : hasBuildingLaundry ? 'In-building' : undefined}
                />
            </div>

            <div className="mt-2">
                <ExpandButton 
                    isExpanded={isExpanded} 
                    onToggle={toggleExpanded} 
                    collapsedText="More Amenities" 
                    expandedText="Less Amenities"
                />
            </div>
            
            {/* Panel that expands/collapses */}
            <div
                className={`transition-all duration-300 ease-in-out ${
                isExpanded 
                  ? 'opacity-100 max-h-[800px] mt-2' 
                  : 'opacity-0 max-h-0 mt-0 hidden'
                }`}
            >
                {/* Simplified amenity display */}
                <div className="flex flex-col gap-2">
                    {/* Notable Amenities */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-base-content/80">Notable Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                            {getAvailableAmenities(notableAmenities).map((amenity, index) => (
                                <span 
                                    key={`notable-${index}`} 
                                    className="px-3 py-1 glass-badge-primary text-primary rounded-full text-sm"
                                >
                                    {formatAmenityName(amenity)}
                                </span>
                            ))}
                            {getAvailableAmenities(notableAmenities).length === 0 && (
                                <span className="text-sm text-gray-500">No notable amenities available</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Miscellaneous Amenities */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-base-content/80">Other Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                            {listingDetails.amenities
                                ?.filter(amenity => 
                                    !keyAmenities.includes(amenity) && 
                                    !notableAmenities.includes(amenity)
                                )
                                .map((amenity, index) => (
                                    <span 
                                        key={`misc-${index}`} 
                                        className="px-3 py-1 glass-panel-nested text-base-content rounded-full text-sm"
                                    >
                                        {formatAmenityName(amenity)}
                                    </span>
                                ))
                            }
                            {listingDetails.amenities
                                ?.filter(amenity => 
                                    !keyAmenities.includes(amenity) && 
                                    !notableAmenities.includes(amenity)
                                ).length === 0 && (
                                    <span className="text-sm text-base-content/80">No additional amenities available</span>
                                )
                            }
                        </div>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                        <h3 className="text-lg font-semibold text-base-content/80">Amenity Analytics</h3>
                        <TooltipIcon tooltipText="Amenity percentile is a quantitative score of the amenities (which is of course highly subjective) of a property relative to other properties with the same number of bedrooms and in the same price band. Weights are ~1 for all key amenities, ~0.5 for notable amenities, and ~0.1 for other amenities." />
                    </div>
                    <PercentileCards 
                        allPercentile={listingDetails.amenity_percentile ?? null}
                        boroughPercentile={listingDetails.amenity_borough_percentile ?? null}
                        neighborhoodPercentile={listingDetails.amenity_neighborhood_percentile ?? null}
                    />
                </div>
            </div>
        </div>
    );
}

// Helper component for primary amenities
function AmenityCard({ 
    title, 
    available, 
    details 
}: { 
    title: string; 
    available: boolean; 
    details?: string;
}) {
    return (
        <div className="p-2 glass-panel-nested rounded-lg flex items-center justify-center text-center gap-1.5">
            <div>
                <div className="font-small">{title}</div>
                {details && <div className="text-xs text-base-content/60">{details}</div>}
            </div>
            {available ? (
                <CheckCircleIcon className="h-6 w-6 text-success" />
            ) : (
                <XCircleIcon className="h-6 w-6 text-error" />
            )}
        </div>
    );
}