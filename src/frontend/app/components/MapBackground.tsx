'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl, { LngLatLike } from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';

const MapBackground = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLightPreset, setMapLightPreset] = useState('dawn'); // Default to dawn
  const initialCoordinates: LngLatLike = [-73.961034, 40.745094]; // Initial NYC coordinates
  const jerseyCity: LngLatLike = [-74.077644, 40.728157]; // Jersey City coordinates
  const animationInitiated = useRef(false);

  // Function to convert UI theme to map light preset
  const getMapLightPresetFromTheme = (theme: string): string => {
    return theme === 'autumn' ? 'dawn' : 'night';
  };

  // Initialize and sync with the UI theme
  useEffect(() => {
    // Get initial theme from localStorage if available
    try {
      const savedTheme = localStorage.getItem('co-apt-theme') || 'autumn';
      const initialLightPreset = getMapLightPresetFromTheme(savedTheme);
      setMapLightPreset(initialLightPreset);
    } catch {
      // localStorage not available
    }

    // Listen for theme changes
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{theme: string}>;
      const newTheme = customEvent.detail.theme;
      const newLightPreset = getMapLightPresetFromTheme(newTheme);
      setMapLightPreset(newLightPreset);
    };

    window.addEventListener('themeChange', handleThemeChange);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  // Map initialization - using a cleanup function to ensure proper re-rendering
  useEffect(() => {
    // Always clear previous map instance first
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      animationInitiated.current = false;
    }

    if (!mapContainerRef.current) return;
    
    // Set access token from env
    mapboxgl.accessToken = "pk.eyJ1IjoiY2hlbndpbGw5OCIsImEiOiJjbTc4M2JiOWkxZWZtMmtweGRyMHRxenZnIn0.RmSgCA0jq_ejQqDHEUj5Pg";
    
    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/chenwill98/cm784fxfi01az01s1fryjdv1u',
        center: initialCoordinates,
        zoom: 15.59,
        pitch: 57.70,
        bearing: 0.00,
        interactive: false,
        attributionControl: false,
        antialias: true
      });

      mapRef.current = map;

      map.on('style.load', () => {
        // Set the initial light preset
        try {
          map.setConfigProperty('basemap', 'lightPreset', mapLightPreset);
        } catch {
          // Light preset not supported
        }
      });

      // Start slow panning animation once the map is fully loaded
      map.on('load', () => {
        if (!animationInitiated.current) {
          // Wait a couple seconds before starting the animation
          setTimeout(() => {
            map.flyTo({
              center: jerseyCity,
              duration: 600000, // Very slow animation (600 seconds)
              essential: true,
              curve: 0.5,
            });
          }, 2000);
          animationInitiated.current = true;
        }
      });
    } catch {
      // Map initialization failed
    }

    // Cleanup function - properly remove map
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependencies - will run once on mount and once on unmount

  // Update the light preset when state changes
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      try {
        mapRef.current.setConfigProperty('basemap', 'lightPreset', mapLightPreset);
      } catch {
        // Light preset not supported
      }
    }
  }, [mapLightPreset]);

  return (
    <div
      ref={mapContainerRef}
      className="fixed inset-0 z-0 w-full h-full"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      id="map-background"
    />
  );
};

export default MapBackground;
