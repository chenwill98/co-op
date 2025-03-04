"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CoAptLogo from "./co-apt-logo";

export default function Navbar() {
  // Keep the current theme in local state
  const [theme, setTheme] = useState("silk");

  // On mount, read the <html data-theme="...">
  useEffect(() => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "silk";
    setTheme(currentTheme);
  }, []);

  // Toggle theme between "corporate" and "autumn"
  function toggleTheme() {
    const newTheme = theme === "silk" ? "autumn" : "silk";
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
        <button className="btn btn-outline mr-2" onClick={toggleTheme}>
          Swap Theme
        </button>
        <Link className="btn btn-outline" href="/login">
          Login
        </Link>
      </div>
    </div>
  );
}
