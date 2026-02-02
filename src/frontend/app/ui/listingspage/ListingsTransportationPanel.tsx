'use client';

import { useState } from "react";
import { CombinedPropertyDetails } from "@/app/lib/definitions";
import SubwayIcon from "@/app/ui/icons/SubwayIcon";
import ExpandButton from "@/app/ui/icons/ExpandButton";
import TooltipIcon from "@/app/ui/icons/TooltipIcon"; 
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { TagList } from "@/app/ui/utilities";
import PercentileCards from "@/app/ui/analytics/PercentileCards";

export default function ListingsTransportationPanel({
  listingDetails,
}: {
  listingDetails: CombinedPropertyDetails;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const stationsPerPage = 8;
  
  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // Use the closest_stations data from listingDetails
  const subwayStations = listingDetails.closest_stations || [];

  // Sort stations by walking minutes; if equal, sort by route_color for visual consistency
  const sortedStations = [...subwayStations].sort((a, b) => {
    const diff = (a.walking_minutes || 999) - (b.walking_minutes || 999);
    if (diff !== 0) return diff;
    return (a.route_color || '').localeCompare(b.route_color || '');
  });

  // Filter stations with time data
  const stationsWithTimeData = sortedStations.filter(s => s.peak !== null || s.off_peak !== null);
  
  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(stationsWithTimeData.length / stationsPerPage));
  const startIndex = currentPage * stationsPerPage;
  const displayedStations = stationsWithTimeData.slice(startIndex, startIndex + stationsPerPage);
  
  // Only add empty rows if we actually have pagination
  const needsPagination = stationsWithTimeData.length > stationsPerPage;
  const emptyRows = needsPagination ? stationsPerPage - displayedStations.length : 0;
  
  // Simple fade transition for page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return;
    
    const tableBody = document.querySelector('.station-table-body');
    if (tableBody) {
      // Fade out
      tableBody.classList.add('opacity-0');
      
      // Change page after short delay
      setTimeout(() => {
        setCurrentPage(newPage);
        // Fade in
        setTimeout(() => {
          tableBody.classList.remove('opacity-0');
        }, 50);
      }, 150);
    } else {
      // Fallback if DOM element not found
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-xl font-semibold text-base-content">Transportation</h2>
      <div className="flex flex-col gap-4">
        <div className="flex-1">
          {/* Display subway lines */}
          <div className="mb-4">
              <h3 className="text-lg font-semibold text-base-content/80 mb-2">
                Nearby Subway Lines
              </h3>
              <div className="flex flex-wrap gap-1 mb-2">
                <TagList category="Transportation" tags={listingDetails.tag_list || []} />
              </div>
              
              {/* Simple grid for subway stations */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 glass-panel-nested rounded-lg">
                  <div className="text-sm font-medium mb-2">Short Walk (&lt; 5 min)</div>
                  <div className="flex flex-wrap gap-2">
                    {sortedStations
                      .filter(station => station.walking_minutes < 5)
                      .map((station, idx) => (
                        <SubwayIcon key={idx} line={station.route_short_name || station.route_id} />
                      ))}
                    {!sortedStations.some(station => station.walking_minutes < 5) && (
                      <span className="text-xs text-base-content/60">No stations</span>
                    )}
                  </div>
                </div>
                
                <div className="p-3 glass-panel-nested rounded-lg">
                  <div className="text-sm font-medium mb-2">Medium Walk (5-10 min)</div>
                  <div className="flex flex-wrap gap-2">
                    {sortedStations
                      .filter(station => station.walking_minutes >= 5 && station.walking_minutes <= 10)
                      .map((station, idx) => (
                        <SubwayIcon key={idx} line={station.route_short_name || station.route_id} />
                      ))}
                    {!sortedStations.some(station => station.walking_minutes >= 5 && station.walking_minutes <= 10) && (
                      <span className="text-xs text-base-content/60">No stations</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
      
      {/* Pass state and toggle handler to the ExpandButton */}
      <div className="">
        <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} collapsedText="More Details" expandedText="Less Details"/>
      </div>

      {/* Panel that expands/collapses */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'opacity-100 max-h-[1000px] mt-2 overflow-visible'
            : 'opacity-0 max-h-0 mt-0 overflow-hidden'
        }`}
      >
        {/* Display detailed subway times when expanded */}
        <div>
            <div className="flex flex-row items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-base-content/80">Subway Access Analytics</h3>
              <TooltipIcon tooltipText="Subway access percentile is a measure of the accessibility of a property to subway stations relative to other properties with the same number of bedrooms and in the same price band. It is calculated based on the number of distinct subway lines accessible within walking distance." />
            </div>
            <PercentileCards 
              allPercentile={listingDetails.subway_access_percentile ?? null}
              boroughPercentile={listingDetails.subway_borough_access_percentile ?? null}
              neighborhoodPercentile={listingDetails.subway_neighborhood_access_percentile ?? null}
            />
            <div className="flex flex-row items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-base-content/80">Detailed Subway Times (min) </h3>
              <TooltipIcon tooltipText="Average wait times for subway lines are limited to a 15 minute walk from the property and derived from publicly available MTA subway schedules" />
            </div>
            <div className="text-xs text-base-content/70">Peak times are weekdays 7:00am to 9:30am and 4:00pm to 7:00pm </div>
            <div className="text-xs text-base-content/70 mb-2">Late-night times are every day from midnight to 7:00am </div>
            <div className="overflow-x-auto glass-panel-nested pt-1 pb-3 p-0.5 rounded-lg">
              <table className="table zebra table-xs w-full">
                <thead>
                  <tr>
                    <th className="w-16">Line</th>
                    <th className="w-30">Station</th>
                    <th className="w-12 text-center">Walk</th>
                    <th className="w-12 text-center">Peak</th>
                    <th className="w-12 text-center whitespace-normal">Off-<br />Peak</th>
                    <th className="w-12 text-center whitespace-normal">Late<br />Night</th>
                  </tr>
                </thead>
                <tbody className="station-table-body transition-opacity duration-150 ease-in-out">
                  {displayedStations.map((station, index) => (
                    <tr key={`travel-${station.route_id}-${index}`} className="h-12">
                      <td className="w-16">
                        <SubwayIcon line={station.route_short_name || station.route_id} />
                      </td>
                      <td className="w-30">{station.stop_name}</td>
                      <td className="w-12 text-center">{station.walking_minutes ? Math.round(station.walking_minutes) : '-'}</td>
                      <td className="w-12 text-center">{station.peak ? Math.round(station.peak / 60) : '-'}</td>
                      <td className="w-12 text-center">{station.off_peak ? Math.round(station.off_peak / 60) : '-'}</td>
                      <td className="w-12 text-center">{station.late_night ? Math.round(station.late_night / 60) : '-'}</td>
                    </tr>
                  ))}
                  
                  {/* Add empty rows to maintain consistent table height, but only when using pagination */}
                  {needsPagination && Array.from({ length: emptyRows }).map((_, index) => (
                    <tr key={`empty-${index}`} className="h-12">
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-2">
                  <button 
                    className="btn btn-sm"
                    onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </button>
                  
                  <span className="text-sm px-2">
                    {currentPage + 1} / {totalPages}
                  </span>
                  
                  <button 
                    className="btn btn-sm"
                    onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}