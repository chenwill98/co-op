'use client';

import React, { useMemo, useState } from "react";
import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { TagList } from "@/app/ui/utilities";
import ExpandButton from "@/app/ui/icons/ExpandButton";
import TooltipIcon from "@/app/ui/icons/TooltipIcon";
import ListingsPOIMap from "./ListingsPOIMap";

export default function ListingsLocationPanel({ listingDetails }: { listingDetails: CombinedPropertyDetails }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };

    // Categories we want to display
    const categories = ['food', 'park', 'grocery', 'fitness_center'];
    
    // Category display name mapping
    const categoryDisplayNames: Record<string, string> = {
        'food': 'Restaurants',
        'park': 'Parks',
        'grocery': 'Groceries',
        'fitness_center': 'Gyms'
    };
    
    // Get POIs from listing details
    const pois = listingDetails.nearest_pois || [];
    const propertyLocation = useMemo(
        () => ({
            latitude: Number(listingDetails.latitude),
            longitude: Number(listingDetails.longitude),
        }),
        [listingDetails.latitude, listingDetails.longitude]
    );
    
    // Group POIs by category
    const poisByCategory = categories.reduce((acc, category) => {
        acc[category] = pois.filter(poi => poi.category === category).slice(0, 5);
        return acc;
    }, {} as Record<string, typeof pois>);

    // Get count of nearby places for each category
    const getCategoryCount = (category: string) => {
        return poisByCategory[category]?.length || 0;
    };

    // Get display name for category using the dictionary
    const getCategoryDisplayName = (category: string) => {
        return categoryDisplayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
    };
    
    // Convert distance in meters to approximate walking time in minutes
    const getWalkingTime = (distanceInMeters: number): string => {
        // Since we have direct distance, convert to Manhattan distance
        // Manhattan distance is approximately sqrt(2) ≈ 1.414 times the direct distance
        const manhattanDistance = distanceInMeters * 1.414;
        
        // Simple estimation: average walking speed is about 5 km/h or 1.4 m/s
        // Convert to minutes: distance (m) / (1.4 m/s * 60 s/min) = distance / 84
        const walkingTimeMinutes = Math.ceil(manhattanDistance / 84);
        return `${walkingTimeMinutes} min`;
    };
    
    // Get the shortest walking time for a category
    const getShortestWalkingTime = (category: string): string => {
        const categoryPois = poisByCategory[category] || [];
        if (categoryPois.length === 0) return "N/A";
        
        // Find the POI with the shortest distance
        const shortestDistance = Math.min(...categoryPois.map(poi => poi.distance));
        return getWalkingTime(shortestDistance);
    };

    // Render the POI table for a specific category
    const renderPOITable = (category: string) => {
        const pois = poisByCategory[category] || [];
        const displayName = getCategoryDisplayName(category);
        
        return (
            <div className="overflow-x-auto">
                <table className="table zebra table-xs w-full">
                    <thead>
                        <tr>
                            <th className="w-3/4">Name</th>
                            <th className="w-1/4 text-center">Walk Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pois.length > 0 ? (
                            pois.map((poi, idx) => (
                                <tr key={`poi-${category}-${idx}`} className="h-12">
                                    <td className="w-3/4">
                                        {poi.website ? (
                                            <a 
                                                href={poi.website} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="link link-primary"
                                            >
                                                {poi.name}
                                            </a>
                                        ) : (
                                            poi.name
                                        )}
                                    </td>
                                    <td className="w-1/4 text-center">{getWalkingTime(poi.distance)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr className="h-12">
                                <td colSpan={3} className="text-center text-base-content/60">No nearby {displayName.toLowerCase()} found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    // Render a location category card
    const renderCategoryCard = (category: string) => {
        const count = getCategoryCount(category);
        const displayName = getCategoryDisplayName(category);
        const shortestTime = getShortestWalkingTime(category);
        
        return (
            <div key={`card-${category}`} className="card glass-panel-nested">
                <div className="card-body p-4">
                    <h3 className="card-title text-base">{displayName}</h3>
                    <div className="text-base-content/70">
                        {count > 0 ? (
                            <div><span className="font-medium">{shortestTime}</span> away</div>
                        ) : (
                            <div>No nearby {displayName.toLowerCase()} found</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-base-content">
                Location
            </h2>
            <div className="flex flex-wrap gap-1">
                <TagList category="Location" tags={listingDetails.tag_list || []} />
            </div>
            <h3 className="text-lg font-semibold text-base-content/80 mb-2">
                Closest Locations
            </h3>
            {/* Auto-generated grid for location categories - 2 rows of 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {categories.map(category => renderCategoryCard(category))}
            </div>

            {/* Pass state and toggle handler to the ExpandButton */}
            <div className="">
                <ExpandButton 
                    isExpanded={isExpanded} 
                    onToggle={toggleExpanded} 
                    collapsedText="More Details" 
                    expandedText="Less Details"
                />
            </div>

            {/* Panel that expands/collapses */}
            <div
                className={`transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? 'opacity-100 max-h-[1000px] mt-2 overflow-visible'
                      : 'opacity-0 max-h-0 mt-0 overflow-hidden'
                }`}
            >
                <div className="flex flex-row items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-base-content/80">Nearby Locations</h3>
                    <TooltipIcon tooltipText="Displaying the 5 closest points of interest for each category" />
                </div>

                <div className="w-full mb-4">
                    <ListingsPOIMap poiData={pois} propertyLocation={propertyLocation} />
                </div>

                {/* Auto-generated tabs based on categories */}
                <div className="tabs tabs-box justify-center">
                    {categories.map((category, index) => (
                        <React.Fragment key={`tab-group-${category}`}>
                            <input type="radio" name="location_tabs" className="tab tabs-sm transition-all duration-500 ease-in-out" aria-label={getCategoryDisplayName(category)} defaultChecked={index === 0} />
                            <div className="tab-content glass-panel-nested m-1 p-1">
                                {renderPOITable(category)}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
