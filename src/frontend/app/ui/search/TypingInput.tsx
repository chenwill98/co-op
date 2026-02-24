"use client";

import React, { useState, useEffect, ChangeEvent, FC } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface TypingInputProps {
  onValueChange?: (val: string) => void;
}

const phrases = [
  "Pre-war 2 bedroom apartments in Bed-Stuy",
  "Charming 1 bedroom apartment that allows pets in Queens",
  "Modern studios near the 6 line",
  "Cozy 3 bedroom apartments in the Bronx",
];

const TypingInput: FC<TypingInputProps> = ({ onValueChange }) => {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(10);
  const [isEditable, setIsEditable] = useState(false);
  const [userHasClicked, setUserHasClicked] = useState(false);
  const [kbdVisible, setKbdVisible] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [startTyping, setStartTyping] = useState(false);

  // -----------------------
  // Initial delay before typing begins
  // -----------------------
  useEffect(() => {
    if (isEditable) return; // Don't start if user has already clicked
    
    // Set a 3-second delay before starting the typing animation
    const initialDelay = setTimeout(() => {
      setStartTyping(true);
    }, 3000);
    
    return () => clearTimeout(initialDelay);
  }, [isEditable]);

  // -----------------------
  // Cursor blinking effect
  // -----------------------
  useEffect(() => {
    if (isEditable) return; // Stop blinking when user is typing
    
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    
    return () => clearInterval(cursorInterval);
  }, [isEditable]);

  // -----------------------
  // Auto-typing effect
  // -----------------------
  useEffect(() => {
    // If user has focused and is typing, we stop auto-typing
    // Also, don't start typing until after the initial delay
    if (isEditable || !startTyping) return;

    const handleTyping = () => {
      const i = loopNum % phrases.length;
      const fullText = phrases[i];

      setText(
        isDeleting
          ? fullText.substring(0, text.length - 1)
          : fullText.substring(0, text.length + 1),
      );

      // If you want different speeds for typing vs deleting, change them:
      setTypingSpeed(isDeleting ? 20 : 50);

      if (!isDeleting && text === fullText) {
        // Add a longer pause (1000ms) when finished typing before starting to delete
        setTimeout(() => setIsDeleting(true), 800);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, typingSpeed, loopNum, isEditable, startTyping]);

  // -----------------------
  // Handle focus -> user starts typing
  // -----------------------
  const handleFocus = () => {
    if (!userHasClicked) {
      setText(""); // Clear auto-typed text only on first interaction
      setUserHasClicked(true);
    }
    setIsEditable(true); // Stop auto-typing

    // Trigger kbd animation after a tiny delay
    setTimeout(() => {
      setKbdVisible(true);
    }, 50);
  };

  const handleBlur = () => {
    setKbdVisible(false);
  };

  // -----------------------
  // Only call onValueChange
  // when user is actually typing
  // -----------------------
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setText(newValue);

    // If there's a prop callback and we've "unlocked" editing,
    // notify the parent of the user-typed text.
    if (onValueChange && isEditable) {
      onValueChange(newValue);
    }
  };

  return (
    <div className="relative w-full group">
      <label className="input w-full border-0 bg-transparent outline-none focus-within:outline-none focus-within:ring-0 shadow-none transition-all duration-200">
      <MagnifyingGlassIcon className="h-5 w-5 opacity-50 group-focus-within:opacity-70 group-focus-within:text-primary transition-all duration-200" />
      <div className="grow flex items-center overflow-hidden relative">
        {!isEditable && (
          <>
            <span className="text-base">{text}</span>
            {showCursor && (
              <div className="h-5 w-0.5 bg-primary animate-pulse ml-0.5"></div>
            )}
          </>
        )}
        <input
          type="text"
          className={`bg-transparent outline-none text-base text-base-content caret-primary ${isEditable ? "grow w-full" : "absolute inset-0 opacity-0 cursor-text"}`}
          value={text}
          placeholder={userHasClicked ? "Search anything..." : ""}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
        />
      </div>
      {isEditable && (
        <div className="transform opacity-70">
          <kbd className={`kbd kbd-md transition-all duration-300 ease-in ${kbdVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>enter</kbd>
        </div>
      )}
      </label>
    </div>
  );
};

export default TypingInput;
