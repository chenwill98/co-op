"use client";

import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consentGiven = localStorage.getItem("cookie-consent");
    
    // Only proceed if consent hasn't been given
    if (!consentGiven) {
      setShowBanner(true);
      // Immediately set visible, let the animation classes handle timing
      setIsVisible(true);
    }
  }, []);

  const handleHideBanner = (shouldSaveConsent = false) => {
    // First make it invisible (triggers animation)
    setIsVisible(false);
    
    // Then after animation completes, remove from DOM
    setTimeout(() => {
      setShowBanner(false);
      
      // If accepting cookies, save to localStorage
      if (shouldSaveConsent) {
        localStorage.setItem("cookie-consent", "true");
      }
    }, 300); // Match this duration with the CSS transition duration
  };

  const acceptCookies = () => {
    handleHideBanner(true);
  };

  if (!showBanner) return null;

  return (
    <div className={`fixed bottom-4 left-0 right-0 flex justify-center z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`card glass-alert mx-4 w-full max-w-2xl rounded-2xl ${isVisible ? 'animate-fade-up-delayed' : ''}`}>
        <div className="card-body p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="card-title text-lg">Cookie Notice</h3>
            <button 
              onClick={() => handleHideBanner(false)}
              className="btn btn-sm btn-ghost p-1"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <p className="text-sm flex-1">
              We use cookies to store your preferences, inform analytics, and save your bookmarked listings. 
              By continuing to use this site, you consent to our use of cookies.
            </p>
            <button 
              onClick={acceptCookies} 
              className="btn btn-primary"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
