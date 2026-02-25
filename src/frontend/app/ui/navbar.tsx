"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CoAptLogo from "./co-apt-logo";

export default function Navbar() {
  // Keep the current theme in local state
  const [theme, setTheme] = useState("autumn");
  // Track newly added bookmarks
  const [newBookmarksCount, setNewBookmarksCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCountRef = useRef(0);

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

  // Animate number transitions
  useEffect(() => {
    if (newBookmarksCount !== prevCountRef.current) {
      if (prevCountRef.current === 0 && newBookmarksCount > 0) {
        // First appearance — just set it immediately (slide-in handles the entrance)
        setDisplayCount(newBookmarksCount);
      } else if (newBookmarksCount > 0) {
        // Number change — crossfade old → new
        setIsAnimating(true);
        const timeout = setTimeout(() => {
          setDisplayCount(newBookmarksCount);
          setIsAnimating(false);
        }, 150);
        prevCountRef.current = newBookmarksCount;
        return () => clearTimeout(timeout);
      }
      prevCountRef.current = newBookmarksCount;
    }
  }, [newBookmarksCount]);

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
    <div className="navbar sticky z-50 top-0 bg-base-100/80 backdrop-blur-lg border-b border-base-300/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.12),0_4px_16px_rgba(0,0,0,0.04)] px-2 lg:px-4 py-2 min-h-0">
      <div className="flex-1">
        <div className="inline-block">
          <Link href="/">
            {/* Pass the current theme to CoAptLogo so it can swap emojis */}
            <CoAptLogo theme={theme} />
          </Link>
        </div>
      </div>
      <div className="flex-none flex items-center gap-4">
        <Link href="/analytics" className="text-primary font-semibold text-sm transition-colors duration-200 hover:text-primary/70">
          Analytics for Nerds
        </Link>
        <Link
          href="/saved"
          onClick={handleSavedClick}
          className="flex items-center text-primary font-semibold text-sm transition-colors duration-200 hover:text-primary/70"
        >
          Saved
          <div
            className="overflow-hidden rounded-full transition-all duration-300 ease-in-out"
            style={{
              maxWidth: newBookmarksCount > 0 ? "3rem" : "0",
              opacity: newBookmarksCount > 0 ? 1 : 0,
            }}
          >
            <span className="inline-flex items-center justify-center ml-1.5 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-content text-xs font-bold">
              <span
                className="transition-opacity duration-150"
                style={{ opacity: isAnimating ? 0 : 1 }}
              >
                {displayCount}
              </span>
            </span>
          </div>
        </Link>
        <label className="swap swap-rotate text-base-content">
          <input
            type="checkbox"
            checked={theme === "abyss"}
            onChange={toggleTheme}
            className="theme-controller"
            value="abyss"
          />
          {/* sun icon - shown when unchecked (light theme) */}
          <svg className="swap-off h-5 w-5 fill-current place-self-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
          </svg>
          {/* moon icon - shown when checked (dark theme) */}
          <svg className="swap-on h-5 w-5 fill-current place-self-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
          </svg>
        </label>
      </div>
    </div>
  );
}
