"use client";

import { useState } from "react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { UserGroupIcon as UserGroupSolidIcon } from "@heroicons/react/24/solid";

export interface ShareToggleButtonProps {
  isInSession: boolean;
  isUpdating: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export default function ShareToggleButton({
  isInSession,
  isUpdating,
  onClick,
}: ShareToggleButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`btn btn-circle bg-base-100/70 backdrop-blur-sm border-0 cursor-pointer hover:bg-base-100/90 active:scale-90 transition shadow-sm ${
        isInSession ? "text-secondary" : "text-primary hover:text-secondary"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isUpdating) onClick(e);
      }}
    >
      {isUpdating ? (
        <span className="loading loading-spinner loading-xs" />
      ) : isInSession || isHovered ? (
        <UserGroupSolidIcon className="w-5 h-5" />
      ) : (
        <UserGroupIcon className="w-5 h-5" />
      )}
    </div>
  );
}
