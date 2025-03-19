import React, { useState, useEffect } from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
  charDelay?: number;
  startDelay?: number;
}

export default function AnimatedText({ 
  text, 
  className = "", 
  charDelay = 20,
  startDelay = 0
}: AnimatedTextProps) {
  const [shouldAnimate, setShouldAnimate] = useState(startDelay === 0);
  
  useEffect(() => {
    if (startDelay > 0) {
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, startDelay);
      
      return () => clearTimeout(timer);
    }
  }, [startDelay]);

  return (
    <span className={className}>
      {shouldAnimate 
        ? text.split('').map((char, index) => (
            <span
              key={index}
              className="inline-block animate-fade-up"
              style={{
                animationDelay: `${index * charDelay}ms`,
                animationFillMode: 'both',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))
        : text.split('').map((char, index) => (
            <span
              key={index}
              className="inline-block opacity-0"
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))
      }
    </span>
  );
}
