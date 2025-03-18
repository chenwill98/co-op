import React from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
  charDelay?: number;
}

export default function AnimatedText({ 
  text, 
  className = "", 
  charDelay = 20 
}: AnimatedTextProps) {
  return (
    <span className={className}>
      {text.split('').map((char, index) => (
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
      ))}
    </span>
  );
}
