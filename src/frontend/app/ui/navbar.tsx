"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CoAptLogo from "./co-apt-logo";

export default function Navbar() {
  // Keep the current theme in local state
  const [theme, setTheme] = useState("autumn");

  // On mount, read the <html data-theme="...">
  useEffect(() => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "autumn";
    setTheme(currentTheme);
  }, []);

  // Toggle theme between "corporate" and "autumn"
  function toggleTheme() {
    const newTheme = theme === "autumn" ? "silk" : "autumn";
    document.documentElement.setAttribute("data-theme", newTheme);
    setTheme(newTheme);
  }

  return (
    <div className="navbar sticky z-10 top-0 bg-base-100 shadow-md">
      <div className="flex-1 px-2">
        <Link href="/">
          {/* Pass the current theme to CoAptLogo so it can swap emojis */}
          <CoAptLogo theme={theme} />
        </Link>
      </div>
      <div className="flex-none">
        <Link href="/saved">
          <button className="btn btn-primary mr-2">
          Saved
          </button>
        </Link>
        <button className="btn btn-primary mr-2" onClick={toggleTheme}>
          Swap Theme
        </button>
      </div>
    </div>
  );
}
