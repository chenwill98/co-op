"use client";

import { useState } from "react";

const MESSAGES = [
  "Nothing to see here!",
  "End of the road, pal.",
  "That's all, folks!",
  "You've seen it all!",
  "No more listings down here.",
];

/* Two-frame smoke animation — puffs drift up-left from the rear of the taxi.
   Both frames are the same dimensions so the absolute overlay aligns perfectly. */
const FRAME_1 = [
"  o         (\\(\\              ",
"   '        (-.-)  ~          ",
"      .-----|__|------.       ",
"      |   T A X I    |>      ",
"      `-(O)-------(O)-'      ",
].join("\n");

const FRAME_2 = [
" o  .       (\\(\\              ",
"   '        (-.-)  ~          ",
"      .-----|__|------.       ",
"      |   T A X I    |>      ",
"      `-(O)-------(O)-'      ",
].join("\n");

export default function EndOfListings() {
  const [message] = useState(
    () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
  );

  return (
    <div className="flex flex-col items-center justify-center pt-32 pb-8 select-none overflow-hidden">
      <div className="w-full relative h-16">
        <div className="animate-taxi-drive absolute whitespace-nowrap">
          <pre className="text-[10px] leading-[1.2] font-mono text-base-content/25 relative" aria-hidden="true">
            <span className="animate-smoke-toggle">{FRAME_1}</span>
            <span className="animate-smoke-toggle-alt absolute inset-0">{FRAME_2}</span>
          </pre>
        </div>
      </div>
      <p className="text-sm text-base-content/25 mt-6 italic">{message}</p>
    </div>
  );
}
