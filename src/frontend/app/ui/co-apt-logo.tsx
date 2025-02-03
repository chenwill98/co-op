"use client";

import { sen } from "@/app/ui/fonts";

export default function CoAptLogo({ theme }: { theme: string }) {
  const emoji = theme === "corporate" ? "🏙️" : "🌆";

  return (
    <div
      className={`${sen.className} flex items-center leading-none font-bold text-primary`}
    >
      <p className="text-4xl">{emoji} Co-Apt</p>
    </div>
  );
}
