"use client";

import { MapIcon } from "@heroicons/react/24/outline";
import Image from 'next/image';
import { Property } from "@/app/lib/definitions";

export interface MapButtonProps {
  listing: Property;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

export default function MapButton({ listing, onClick, className }: MapButtonProps) {
  return (
    <div
      onClick={onClick}
      className={className}
    >
      <div className="dropdown dropdown-end dropdown-top">
        <div 
          tabIndex={0} 
          role="button" 
          className="btn btn-sm btn-ghost btn-circle"
        >
          <MapIcon className="w-5 h-5" />
        </div>
        <div tabIndex={0} className="dropdown-content z-[9999] mb-2 shadow-xl rounded-lg overflow-hidden w-64 h-64">
          <Image
            src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+f74e4e(${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'})/${listing.longitude || '-73.935242'},${listing.latitude || '40.730610'},12/300x300@2x?access_token=pk.eyJ1IjoiY2hlbndpbGw5OCIsImEiOiJjbTc4M2JiOWkxZWZtMmtweGRyMHRxenZnIn0.RmSgCA0jq_ejQqDHEUj5Pg`}
            alt={`Map location for ${listing.address}`}
            width={300}
            height={300}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
