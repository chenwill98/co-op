"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CoAptLogo from "./co-apt-logo";
import { ChartBarSquareIcon, BookmarkSquareIcon } from "@heroicons/react/24/outline";

export default function Navbar() {
  // Keep the current theme in local state
  const [theme, setTheme] = useState("autumn");
  // Track newly added bookmarks
  const [newBookmarksCount, setNewBookmarksCount] = useState(0);

  // On mount, read the theme from localStorage or use the <html data-theme="...">
  // Initialize theme and bookmark counter on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("co-apt-theme");
    const currentTheme = savedTheme || 
      document.documentElement.getAttribute("data-theme") || "autumn";
    setTheme(currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
    
    // Initialize bookmark counter from localStorage
    const storedCount = localStorage.getItem("new-bookmarks-count");
    if (storedCount) {
      setNewBookmarksCount(parseInt(storedCount, 10));
    }

  }, []);

  // Set up listener for bookmark counter changes
  useEffect(() => {
    // Set up a periodic check for bookmark count changes
    const checkBookmarkCount = () => {
      const storedCount = localStorage.getItem("new-bookmarks-count");
      if (storedCount) {
        const count = parseInt(storedCount, 10);
        setNewBookmarksCount(count);
      }
    };
    
    // Run initial check
    checkBookmarkCount();
    
    // Check every 150ms for changes to the localStorage value (more responsive)
    const intervalId = setInterval(checkBookmarkCount, 150);
    
    // Subscribe to storage events from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "new-bookmarks-count") {
        checkBookmarkCount();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Reset bookmark counter when user visits saved page
  const handleSavedClick = () => {
    setNewBookmarksCount(0);
    localStorage.setItem("new-bookmarks-count", "0");
  };

  // Toggle theme between "autumn" and "abyss"
  function toggleTheme(e: React.ChangeEvent<HTMLInputElement>) {
    const newTheme = e.target.checked ? "abyss" : "autumn";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("co-apt-theme", newTheme);
    // Dispatch a custom event so other components can react to theme changes
    window.dispatchEvent(new CustomEvent("themeChange", { detail: { theme: newTheme } }));
    setTheme(newTheme);
  }

  return (
    <div className="navbar sticky z-10 top-0 bg-base-100 shadow-md">
      <div className="flex-1 px-2">
        <div className="inline-block">
          <Link href="/">
            {/* Pass the current theme to CoAptLogo so it can swap emojis */}
            <CoAptLogo theme={theme} />
          </Link>
        </div>
      </div>
      <div className="flex-none">
        <Link href="/analytics">
          <span className="text-primary font-semibold text-sm hover:text-primary/70 transition-colors duration-200 px-4 py-2 cursor-pointer">
            Analytics for Nerds
          </span>
        </Link>
        <Link href="/saved" onClick={handleSavedClick}>
          <div className="indicator mr-2">
            {newBookmarksCount > 0 && (
              <span className="indicator-item badge badge-primary badge-sm transition-all duration-300 ease-in-out">{newBookmarksCount}</span>
            )}
            <span className="text-primary font-semibold text-sm hover:text-primary/70 transition-colors duration-200 px-4 py-2 cursor-pointer">
              Saved
            </span>
          </div>
        </Link>
        <label className="toggle text-base-content mr-2">
          <input 
            type="checkbox" 
            checked={theme === "abyss"}
            onChange={toggleTheme}
            className="theme-controller"
          />
          <svg aria-label="sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></g></svg>
          <svg aria-label="moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></g></svg>
        </label>
      </div>
    </div>
  );
}
