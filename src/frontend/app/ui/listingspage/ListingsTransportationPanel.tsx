'use client';

import React, { useState, useEffect } from 'react';
import { CombinedPropertyDetails } from "@/app/lib/definitions";
import { TagList } from "@/app/ui/utilities";
import { getDistanceFromLatLonInMeters, extractLine } from "../geo-helpers";
import SubwayIcon from "@/app/ui/icons/SubwayIcon";
import ExpandButton from "@/app/ui/icons/ExpandButton";

export default function ListingsTransportationPanel({
  listingDetails,
}: {
  listingDetails: CombinedPropertyDetails;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };
  const [walkingDistance, setWalkingDistance] = useState<number>(10);
  const [subwayLines, setSubwayLines] = useState<{ line: string; distance: number }[]>([]);
  // Save all stops once, then filter client side
  const [allStops, setAllStops] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);


  // IMPORTANT NOTE: Will definitely just be refactored to a process in the backend
  useEffect(() => {
    // Fetch data once using the maximum radius (15 minutes walking * 80 m/min)
    const fetchStops = async () => {
      setLoading(true);
      try {
        const maxWalkingTimeMinutes = 15;
        const maxDistanceMeters = maxWalkingTimeMinutes * 80;
        const apiKey = "MN5967r2RkGSYxpnYr932BvQjoDC1Ti0";
        const apiUrl = `https://transit.land/api/v2/rest/stops?lat=${listingDetails.latitude}&lon=${listingDetails.longitude}&radius=${maxDistanceMeters}&vehicle_type=subway&apikey=${apiKey}`;
        
        const response = await fetch(apiUrl);
        const { stops = [] } = await response.json();
        
        setAllStops(stops);
      } catch (error) {
        console.error('Error fetching subway stops:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStops();
  }, [listingDetails.latitude, listingDetails.longitude]);

  useEffect(() => {
    if (!allStops.length) return;

    // Determine the current maximum distance based on the selected walking distance
    const currentMaxMeters = walkingDistance * 80;

    // Filter stops that are within the selected walking distance and have location_type === 1
    const filteredStops = allStops.filter((stop: any) => {
      if (stop.location_type !== 1) return false;
      const [stopLon, stopLat] = stop.geometry.coordinates;
      const distance = getDistanceFromLatLonInMeters(
        listingDetails.latitude,
        listingDetails.longitude,
        stopLat,
        stopLon
      );
      return distance <= currentMaxMeters;
    });

    // Group stops by subway line, storing the minimum distance for each line
    const lineMap: { [key: string]: number } = {};
    filteredStops.forEach((stop: any) => {
      const line = extractLine(stop.stop_id);
      const [stopLon, stopLat] = stop.geometry.coordinates;
      const distance = getDistanceFromLatLonInMeters(
        listingDetails.latitude,
        listingDetails.longitude,
        stopLat,
        stopLon
      );
      if (!lineMap[line] || distance < lineMap[line]) {
        lineMap[line] = distance;
      }
    });

    const linesArray = Object.entries(lineMap).map(([line, distance]) => ({
      line,
      distance,
    }));

    setSubwayLines(linesArray);
  }, [walkingDistance, allStops, listingDetails.latitude, listingDetails.longitude]);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-semibold text-gray-800">Transportation</h2>
      <div className="flex flex-wrap gap-1">
        <TagList category="Transportation" tags={listingDetails.tags || []} />
      </div>
      <div className="">
        <label htmlFor="walkingDistance">Walking Distance (minutes): </label>
        <select
          id="walkingDistance"
          value={walkingDistance}
          onChange={(e) => setWalkingDistance(Number(e.target.value))}
          className="select select-bordered ml-2"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
        </select>
      </div>
      <div className="">
        {loading ? (
          <div>Loading subway lines...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {subwayLines.map(({ line, distance }) => (
              <div className="flex items-center gap-2" key={line}>
                <SubwayIcon line={line} />
                {Math.round(distance / 80)} min walk
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Pass state and toggle handler to the ExpandButton */}
      <div className="">
          <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} />
      </div>
      {/* Panel that expands/collapses */}
      <div
          className={`overflow-hidden transition-max-height duration-500 ease-in-out ${
          isExpanded ? 'max-h-40' : 'max-h-0'
          }`}
      >
          <p className="mt-2 text-gray-700">
          This is some additional dummy information that is revealed when the button is clicked.
          </p>
      </div>
    </div>
  );
}