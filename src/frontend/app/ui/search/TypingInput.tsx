"use client";

import React, { useState, useEffect, ChangeEvent, FC } from "react";

interface TypingInputProps {
  onValueChange?: (val: string) => void;
}

const TypingInput: FC<TypingInputProps> = ({ onValueChange }) => {
  const [text, setText] = useState("");
  const phrases = [
    "Pre-war 2 bedroom apartments in Bed-Stuy",
    "Charming 1 bedroom apartment that allows pets in Queens",
    "Modern studios near the 6 line",
  ];
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(10);
  const [isEditable, setIsEditable] = useState(false);
  const [userHasClicked, setUserHasClicked] = useState(false);
  const [kbdVisible, setKbdVisible] = useState(false);

  // -----------------------
  // Auto-typing effect
  // -----------------------
  useEffect(() => {
    // If user has focused and is typing, we stop auto-typing
    if (isEditable) return;

    const handleTyping = () => {
      const i = loopNum % phrases.length;
      const fullText = phrases[i];

      setText(
        isDeleting
          ? fullText.substring(0, text.length - 1)
          : fullText.substring(0, text.length + 1),
      );

      // If you want different speeds for typing vs deleting, change them:
      setTypingSpeed(isDeleting ? 30 : 30);

      if (!isDeleting && text === fullText) {
        setTimeout(() => setIsDeleting(true), 500);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, typingSpeed, loopNum, phrases, isEditable]);

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
    <div className="relative w-full">
      <input
        type="text"
        className="input w-full pr-24"
        value={text}
        placeholder={userHasClicked ? "Search anything..." : ""}
        onFocus={handleFocus}
        onChange={handleChange}
      />
      {isEditable && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-70">
          <kbd className={`kbd kbd-md transition-all duration-300 ease-in ${kbdVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>enter</kbd>
        </div>
      )}
    </div>
  );
};

export default TypingInput;
