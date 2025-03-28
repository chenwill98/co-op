import Image from 'next/image';

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
  "FX": "/subwayIcons/fx.svg",
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
  return (
    <Image
      src={iconLink}
      alt={`Subway icon for line ${line}`}
      width={24}
      height={24}
      className="w-6 h-6"
    />
  );
}