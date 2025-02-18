// src/frontend/app/ui/icons/SubwayIcon.tsx

import imageFor1 from "@/public/subwayIcons/1.svg";
import imageFor2 from "@/public/subwayIcons/2.svg";
import imageFor3 from "@/public/subwayIcons/3.svg";
import imageFor4 from "@/public/subwayIcons/4.svg";
import imageFor5 from "@/public/subwayIcons/5.svg";
import imageFor6 from "@/public/subwayIcons/6.svg";
import imageFor6X from "@/public/subwayIcons/6x.svg";
import imageFor7 from "@/public/subwayIcons/7.svg";
import imageFor7X from "@/public/subwayIcons/7x.svg";
import imageForA from "@/public/subwayIcons/a.svg";
import imageForB from "@/public/subwayIcons/b.svg";
import imageForC from "@/public/subwayIcons/c.svg";
import imageForD from "@/public/subwayIcons/d.svg";
import imageForE from "@/public/subwayIcons/e.svg";
import imageForF from "@/public/subwayIcons/f.svg";
import imageForG from "@/public/subwayIcons/g.svg";
import imageForJ from "@/public/subwayIcons/j.svg";
import imageForL from "@/public/subwayIcons/l.svg";
import imageForM from "@/public/subwayIcons/m.svg";
import imageForN from "@/public/subwayIcons/n.svg";
import imageForQ from "@/public/subwayIcons/q.svg";
import imageForR from "@/public/subwayIcons/r.svg";
import imageForShuttle from "@/public/subwayIcons/s.svg";
import imageForSIR from "@/public/subwayIcons/sir.svg";
import imageForW from "@/public/subwayIcons/w.svg";
import imageForZ from "@/public/subwayIcons/z.svg";
import imageForAccesible from "@/public/subwayIcons/acc.svg";

type SubwayIconProps = {
  /** The subway line identifier (e.g., "A", "7X", "3", etc.) */
  line: string;
};

// Map subway line IDs to the corresponding SVG URL.
const subwayLineToImage: Record<string, string> = {
  "1": "/subwayIcons/1.svg",
  "2": "/subwayIcons/2.svg",
  "3": "/subwayIcons/3.svg",
  "4": "/subwayIcons/4.svg",
  "5": "/subwayIcons/5.svg",
  "5X": "/subwayIcons/5x.svg",
  "6": "/subwayIcons/6.svg",
  "6X": "/subwayIcons/6x.svg",
  "7": "/subwayIcons/7.svg",
  "7X": "/subwayIcons/7x.svg",
  "A": "/subwayIcons/a.svg",
  "B": "/subwayIcons/b.svg",
  "C": "/subwayIcons/c.svg",
  "D": "/subwayIcons/d.svg",
  "E": "/subwayIcons/e.svg",
  "F": "/subwayIcons/f.svg",
  "FS": "/subwayIcons/s.svg",
  "FX": "/subwayIcons/f.svg",
  "G": "/subwayIcons/g.svg",
  "GS": "/subwayIcons/s.svg",
  "H": "/subwayIcons/s.svg",
  "J": "/subwayIcons/j.svg",
  "L": "/subwayIcons/l.svg",
  "M": "/subwayIcons/m.svg",
  "N": "/subwayIcons/n.svg",
  "Q": "/subwayIcons/q.svg",
  "R": "/subwayIcons/r.svg",
  "S": "/subwayIcons/s.svg",
  "SIR": "/subwayIcons/sir.svg",
  "SI": "/subwayIcons/sir.svg",
  "W": "/subwayIcons/w.svg",
  "Z": "/subwayIcons/z.svg",
  "AD": "/subwayIcons/ad.svg",
};

export default function SubwayIcon({ line }: { line: string }) {
  const iconLink = subwayLineToImage[line.toUpperCase()] || "";
  console.log(iconLink);
  return (
    <img
      src={iconLink}
      alt={`Subway icon for line ${line}`}
      className="w-8 h-8"
    />
  );
}