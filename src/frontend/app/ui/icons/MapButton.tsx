"use client";

import { useState } from "react";
import { MapIcon } from "@heroicons/react/24/outline";
import { MapIcon as MapSolidIcon } from "@heroicons/react/24/solid";

export interface MapButtonProps {
  showingMap: boolean;
  onToggleMap: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

export default function MapButton({ showingMap, onToggleMap, className }: MapButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      className={className}
    >
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-circle text-primary/80 cursor-pointer hover:text-primary active:scale-90 transition"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onToggleMap}
      >
        {(isHovered || showingMap) ? (
          <MapSolidIcon className="w-5 h-5" />
        ) : (
          <MapIcon className="w-5 h-5" />
        )}
      </div>
    </div>
  );
}
