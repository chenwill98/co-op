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

  // Split into words to prevent mid-word line breaks
  const words = text.split(' ');
  let charIndex = 0;

  return (
    <span className={className}>
      {words.map((word, wordIndex) => {
        const startIndex = charIndex;
        charIndex += word.length + 1; // +1 for the space

        return (
          <React.Fragment key={wordIndex}>
            <span className="inline-block whitespace-nowrap">
              {word.split('').map((char, i) => (
                <span
                  key={i}
                  className={shouldAnimate ? "inline-block animate-fade-up" : "inline-block opacity-0"}
                  style={shouldAnimate ? {
                    animationDelay: `${(startIndex + i) * charDelay}ms`,
                    animationFillMode: 'both',
                  } : undefined}
                >
                  {char}
                </span>
              ))}
            </span>
            {wordIndex < words.length - 1 && (
              <span
                className={shouldAnimate ? "inline-block animate-fade-up" : "inline-block opacity-0"}
                style={shouldAnimate ? {
                  animationDelay: `${(startIndex + word.length) * charDelay}ms`,
                  animationFillMode: 'both',
                } : undefined}
              >
                {'\u00A0'}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </span>
  );
}
