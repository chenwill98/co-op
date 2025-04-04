"use client";

import { useState, useEffect, useRef } from "react";
import { BookmarkSquareIcon as BookmarkOutlineIcon } from "@heroicons/react/24/outline";
import { BookmarkSquareIcon as BookmarkSolidIcon } from "@heroicons/react/24/solid";
import { Property } from "@/app/lib/definitions";
const mojs = typeof window !== 'undefined' ? (await import('@mojs/core')).default : null;


export interface BookmarkIconProps {
  property: Property;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

export default function BookmarkIcon({ property, onClick, className }: BookmarkIconProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Reference to the bookmark icon element
  const bookmarkRef = useRef<HTMLDivElement>(null);

  // Mark component as mounted on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if property is bookmarked after mounting
  useEffect(() => {
    if (isMounted) {
      const savedListings = getSavedListings();
      const isAlreadySaved = savedListings.some(listing => listing.id === property.id);
      setIsBookmarked(isAlreadySaved);
    }
  }, [isMounted, property.id]);

  // Get saved listings from localStorage
  const getSavedListings = (): Property[] => {
    try {
      const savedListingsJson = localStorage.getItem('saved_listings');
      return savedListingsJson ? JSON.parse(savedListingsJson) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  };

  // Convert BigInt values to regular numbers
  const preparePropForStorage = (prop: Property): any => {
    // Create a new object to avoid modifying the original
    const result: Record<string, any> = {};
    
    // Process each property, converting BigInt to number
    Object.entries(prop).forEach(([key, value]) => {
      if (typeof value === 'bigint') {
        result[key] = Number(value);
      } else if (Array.isArray(value)) {
        // For arrays (like amenities), process each item
        result[key] = value.map(item => 
          typeof item === 'bigint' ? Number(item) : item
        );
      } else {
        result[key] = value;
      }
    });
    
    return result;
  };

  // Toggle bookmark status
  const toggleBookmark = (e: React.MouseEvent<HTMLDivElement>) => {
    // Stop event propagation to prevent navigation
    e.preventDefault();
    e.stopPropagation();
    
    // Only run if mounted (client-side)
    if (!isMounted) return;
    
    try {
      const savedListings = getSavedListings();
      const wasBookmarked = isBookmarked;
      
      if (wasBookmarked) {
        // Remove from bookmarks
        const updatedListings = savedListings.filter(listing => listing.id !== property.id);
        localStorage.setItem('saved_listings', JSON.stringify(updatedListings));
        
        // Directly decrement the new bookmarks counter
        const currentCount = parseInt(localStorage.getItem('new-bookmarks-count') || '0', 10);
        const newCount = Math.max(0, currentCount - 1); // Prevent negative values
        localStorage.setItem('new-bookmarks-count', newCount.toString());
      } else {
        // Add to bookmarks - trigger animation only when adding
        const propertyForStorage = preparePropForStorage(property);
        localStorage.setItem('saved_listings', JSON.stringify([...savedListings, propertyForStorage]));
        
        // Directly increment the new bookmarks counter
        const currentCount = parseInt(localStorage.getItem('new-bookmarks-count') || '0', 10);
        const newCount = currentCount + 1;
        localStorage.setItem('new-bookmarks-count', newCount.toString());
        
        // Create and play the burst animation
        if (bookmarkRef.current) {
          const rect = bookmarkRef.current.getBoundingClientRect();
          const burstX = rect.left + rect.width / 2;
          const burstY = rect.top + rect.height / 2;
          
          const burst = new mojs.Burst({
            radius: { 10: 20 },
            count: 6,
            left: 0,
            top: 0,
            x: burstX,
            y: burstY,
            children: {
              shape: 'circle',
              fill: { 'magenta': 'cyan' },
              scale: { 0.4: 0.8, easing: 'elastic.out' },
              opacity: { 1: 0 },
              duration: 500,
              scaleX: 0.8,
              scaleY: 0.4
            }
          });
          
          burst.play();
        }
      }
      
      setIsBookmarked(!wasBookmarked);
    } catch (error) {
      console.error('Error updating bookmarks:', error);
    }
  };

  // Show placeholder during server rendering
  if (!isMounted) {
    return <div className={className}><div className="w-6 h-6"></div></div>;
  }

  return (
    <div
      onClick={onClick}
      className={className}
    >
      <div
        ref={bookmarkRef}
        className="w-6 h-6 text-primary cursor-pointer hover:text-primary-focus active:scale-90 transition"
        onClick={toggleBookmark}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isBookmarked || isHovered ? (
          <BookmarkSolidIcon className="w-6 h-6" />
        ) : (
          <BookmarkOutlineIcon className="w-6 h-6" />
        )}
      </div>
    </div>
  );
}
