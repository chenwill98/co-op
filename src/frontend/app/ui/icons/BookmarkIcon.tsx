"use client";

import { useState, useEffect, useRef } from "react";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { Property } from "@/app/lib/definitions";


export interface BookmarkIconProps {
  property: Property;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

export default function BookmarkIcon({ property, onClick, className }: BookmarkIconProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mojsInstance, setMojsInstance] = useState<any>(null);
  
  // Reference to the bookmark icon element
  const bookmarkRef = useRef<HTMLDivElement>(null);

  // Load mo.js and mark component as mounted on client
  useEffect(() => {
    setIsMounted(true);
    
    // Dynamically import mo.js only on the client side
    if (typeof window !== 'undefined') {
      import('@mojs/core').then((mod) => {
        setMojsInstance(mod.default);
      }).catch(error => {
        console.error('Error loading mo.js:', error);
      });
    }
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
  const preparePropForStorage = (prop: Property): Record<string, unknown> => {
    // Create a new object to avoid modifying the original
    const result: Record<string, unknown> = {};
    
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
        
        // Create and play the burst animation at the exact position of the icon
        if (bookmarkRef.current && mojsInstance) {
          // Create a temporary HTML element for the animation
          const burstEl = document.createElement('div');
          document.body.appendChild(burstEl);
          
          // Position the element at the exact location of the bookmark icon
          const updatePosition = () => {
            if (!bookmarkRef.current) return;
            
            const rect = bookmarkRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Position the burst element
            burstEl.style.position = 'fixed';
            burstEl.style.left = `${centerX}px`;
            burstEl.style.top = `${centerY}px`;
            burstEl.style.zIndex = '9999';
            burstEl.style.pointerEvents = 'none';
          };
          
          // Initial positioning
          updatePosition();
          
          // Create the burst animation
          const burst = new mojsInstance.Burst({
            parent: burstEl,
            radius: { 10: 20 },
            count: 6,
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
          
          // Play the animation
          burst.play();
          
          // Clean up after animation completes
          setTimeout(() => {
            if (document.body.contains(burstEl)) {
              document.body.removeChild(burstEl);
            }
          }, 1000);
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
        className="btn btn-circle bg-base-100/70 backdrop-blur-sm border-0 text-primary cursor-pointer hover:bg-base-100/90 hover:text-primary active:scale-90 transition shadow-sm"
        onClick={toggleBookmark}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isBookmarked || isHovered ? (
          <HeartSolidIcon className="w-6 h-6" />
        ) : (
          <HeartOutlineIcon className="w-6 h-6" />
        )}
      </div>
    </div>
  );
}
