"use client";

import { useRouter } from "next/navigation";
import { useListingsContext } from "@/app/context/ListingsContext";
import { FormatDisplayText } from "@/app/ui/utilities";

interface BreadcrumbNavProps {
  borough: string;
  neighborhood: string;
  address: string;
}

export default function BreadcrumbNav({ borough, neighborhood, address }: BreadcrumbNavProps) {
  const router = useRouter();
  const { clear, setPendingMessage } = useListingsContext();

  const handleAreaClick = (area: string) => {
    clear();
    setPendingMessage(`listings in ${FormatDisplayText(area)}`);
    router.push("/listings");
  };

  return (
    <nav className="breadcrumbs" aria-label="breadcrumbs">
      <ul className="flex items-center">
        <li>
          <button
            onClick={() => handleAreaClick(borough)}
            className="glass-chip cursor-pointer hover:no-underline"
          >
            {FormatDisplayText(borough)}
          </button>
        </li>
        <li>
          <button
            onClick={() => handleAreaClick(neighborhood)}
            className="glass-chip cursor-pointer hover:no-underline"
          >
            {FormatDisplayText(neighborhood)}
          </button>
        </li>
        <li className="text-base-content/60 text-xs font-medium">
          <span className="hover:no-underline cursor-default">{address}</span>
        </li>
      </ul>
    </nav>
  );
}
