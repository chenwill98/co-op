'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl, { LngLatLike } from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';

const INITIAL_COORDINATES: LngLatLike = [-73.961034, 40.745094];
const JERSEY_CITY_COORDINATES: LngLatLike = [-74.077644, 40.728157];

const getMapLightPresetFromTheme = (theme: string): string => {
  return theme === 'autumn' ? 'dawn' : 'night';
};

const getInitialLightPreset = (): string => {
  try {
    const savedTheme = localStorage.getItem('co-apt-theme') || 'autumn';
    return getMapLightPresetFromTheme(savedTheme);
  } catch {
    return 'dawn';
  }
};

const MapBackground = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLightPreset, setMapLightPreset] = useState(getInitialLightPreset);
  const mapLightPresetRef = useRef(mapLightPreset);
  const [mapReady, setMapReady] = useState(false);
  const animationInitiated = useRef(false);

  // Listen for theme changes
  useEffect(() => {
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

  // Keep the ref in sync with state
  useEffect(() => {
    mapLightPresetRef.current = mapLightPreset;
  }, [mapLightPreset]);

  // Map initialization - using a cleanup function to ensure proper re-rendering
  useEffect(() => {
    // Always clear previous map instance first
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      animationInitiated.current = false;
      setMapReady(false);
    }

    if (!mapContainerRef.current) return;
    
    // Set access token from env
    const mapboxToken = process.env.MAPBOX_TOKEN;
    if (!mapboxToken) return;
    mapboxgl.accessToken = mapboxToken;
    
    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/chenwill98/cm784fxfi01az01s1fryjdv1u',
        center: INITIAL_COORDINATES,
        zoom: 15.59,
        pitch: 57.70,
        bearing: 0.00,
        interactive: false,
        attributionControl: false,
        antialias: true
      });

      mapRef.current = map;

      // Apply light preset and start animation once the map is fully loaded
      map.on('load', () => {
        // Apply the initial light preset now that the style is loaded
        try {
          map.setConfigProperty('basemap', 'lightPreset', mapLightPresetRef.current);
        } catch {
          // Light preset not supported
        }

        // Wait for the map to finish rendering with the new preset before revealing
        map.once('idle', () => {
          setMapReady(true);
        });

        if (!animationInitiated.current) {
          // Wait a couple seconds before starting the animation
          setTimeout(() => {
            map.flyTo({
              center: JERSEY_CITY_COORDINATES,
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
      className={`fixed inset-0 z-0 w-full h-full transition-opacity duration-700 ${mapReady ? 'opacity-100' : 'opacity-0'}`}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      id="map-background"
    />
  );
};

export default React.memo(MapBackground);
