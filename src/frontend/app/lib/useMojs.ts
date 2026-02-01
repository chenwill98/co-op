"use client";

import { useEffect, useState, useRef } from 'react';

// Hook to safely handle mo.js animations
export function useMojs() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mojs, setMojs] = useState<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Only import mo.js once
    if (!initialized.current) {
      initialized.current = true;
      
      // Dynamic import of mo.js in useEffect guarantees client-side only execution
      import('@mojs/core')
        .then(mod => {
          setMojs(mod.default);
        })
        .catch(err => {
          console.error('Error loading mo.js:', err);
        });
    }
  }, []);

  // Function to create a burst animation
  const createBurst = (element: HTMLElement | null) => {
    if (!element || !mojs) return;
    
    try {
      const rect = element.getBoundingClientRect();
      const burstX = rect.left + rect.width / 2;
      const burstY = rect.top + rect.height / 2;
      
      const burst = new mojs.Burst({
        radius: { 0: 30 },
        count: 10,
        x: burstX,
        y: burstY,
        children: {
          fill: { 'magenta': 'cyan' },
          duration: 500
        }
      });
      
      burst.play();
    } catch (error) {
      console.error('Error creating burst animation:', error);
    }
  };

  return { mojs, createBurst };
}
