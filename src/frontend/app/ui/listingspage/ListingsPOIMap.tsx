import React, { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { PropertyNearestPois } from '@/app/lib/definitions';

interface ListingsPOIMapProps {
  poiData: PropertyNearestPois[];
  propertyLocation?: { longitude: number; latitude: number }; // Optional property location
}

// Generate a map pin with category icon
const generatePinWithIcon = (category: string, color: string): string => {
  const iconPath = getCategoryIconPath(category);

  return `
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <path fill="${color}" d="M18 2C11.373 2 6 7.373 6 14c0 5.018 2.195 8.978 5.172 12.896C13.466 30.59 16.283 33 18 33c1.717 0 4.534-2.41 6.828-6.104C27.805 22.978 30 19.018 30 14c0-6.627-5.373-12-12-12z" filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.3))"/>
        <g transform="translate(11, 7)" fill="white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${iconPath}
          </svg>
        </g>
      </svg>
    `;
};

// Helper function to get category icon path from Lucide icons
const getCategoryIconPath = (category: string): string => {
  switch (category) {
    case 'park':
      return '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>';
    case 'food':
      return '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>';
    case 'grocery':
      return '<path d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"/><path d="M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z"/><path d="M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z"/>';
    case 'fitness_center':
      return '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>';
    default:
      return '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
  }
};

// Helper function to get color based on category
const getIconColorForCategory = (category: string): string => {
  switch (category) {
    case 'park': return '#3bb2d0';
    case 'food': return '#e55e5e';
    case 'grocery': return '#f8a51b';
    case 'fitness_center': return '#9c51b6';
    default: return '#666666';
  }
};

const ListingsPOIMap = ({ poiData, propertyLocation }: ListingsPOIMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const latestPoiDataRef = useRef<PropertyNearestPois[]>(poiData);
  const latestPropertyLocationRef = useRef<ListingsPOIMapProps['propertyLocation']>(propertyLocation);
  const lastFittedVersionRef = useRef('');

  const mapboxToken = process.env.MAPBOX_TOKEN;

  const poiDataVersion = useMemo(() => {
    const start = poiData[0];
    const end = poiData[poiData.length - 1];
    const center = propertyLocation
      ? `${propertyLocation.latitude},${propertyLocation.longitude}`
      : 'none';

    return `${poiData.length}:${start?.listing_id ?? ''}:${start?.name ?? ''}:${end?.name ?? ''}:${center}`;
  }, [poiData, propertyLocation]);

  const clearMarkers = () => {
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];
  };

  const refreshMarkers = (fitToBounds: boolean) => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const nextPoiData = latestPoiDataRef.current;
    const nextPropertyLocation = latestPropertyLocationRef.current;

    clearMarkers();

    if (nextPoiData.length === 0) {
      if (nextPropertyLocation) {
        const propertyMarker = new mapboxgl.Marker({ color: '#ff0000', scale: 1.2 })
          .setLngLat([nextPropertyLocation.longitude, nextPropertyLocation.latitude])
          .addTo(map);

        markersRef.current.push(propertyMarker);
      }
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();

    for (const poi of nextPoiData) {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '36px';
      el.style.height = '42px';
      el.style.cursor = 'pointer';

      const iconColor = getIconColorForCategory(poi.category);
      el.innerHTML = generatePinWithIcon(poi.category, iconColor);

      const manhattanDistance = poi.distance * 1.414;
      const walkingTimeMinutes = Math.ceil(manhattanDistance / 84);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([poi.longitude, poi.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, focusAfterOpen: false }).setHTML(`
                <div class="p-1 rounded-4xl">
                  <h3 class="font-bold">
                    ${poi.website ? `<a href="${poi.website}" target="_blank" class="text-blue-500 hover:underline">${poi.name}</a>` : poi.name}
                  </h3>
                  <p>${poi.address || 'No address available'}</p>
                  <p>${walkingTimeMinutes} min walk</p>
                </div>
              `)
        )
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([poi.longitude, poi.latitude]);
    }

    if (nextPropertyLocation) {
      const propertyMarker = new mapboxgl.Marker({ color: '#ff0000', scale: 1.2 })
        .setLngLat([nextPropertyLocation.longitude, nextPropertyLocation.latitude])
        .addTo(map);

      markersRef.current.push(propertyMarker);
      bounds.extend([nextPropertyLocation.longitude, nextPropertyLocation.latitude]);
    }

    if (fitToBounds && !bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 500 });
    }
  };

  useEffect(() => {
    latestPoiDataRef.current = poiData;
    latestPropertyLocationRef.current = propertyLocation;
  }, [poiData, propertyLocation]);

  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const initialCenter: [number, number] = propertyLocation
      ? [propertyLocation.longitude, propertyLocation.latitude]
      : poiData.length > 0
        ? [poiData[0].longitude, poiData[0].latitude]
        : [-73.95, 40.73];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: 14,
    });

    mapRef.current = map;

    map.on('load', () => {
      loadedRef.current = true;
      refreshMarkers(true);
      lastFittedVersionRef.current = poiDataVersion;
    });

    return () => {
      loadedRef.current = false;
      clearMarkers();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      lastFittedVersionRef.current = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  useEffect(() => {
    if (!mapRef.current || !loadedRef.current) return;

    const shouldFit = lastFittedVersionRef.current !== poiDataVersion;
    refreshMarkers(shouldFit);

    if (shouldFit) {
      lastFittedVersionRef.current = poiDataVersion;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poiDataVersion]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full rounded-xl overflow-hidden aspect-square border border-base-300/45 shadow-subtle"
    />
  );
};

export default React.memo(ListingsPOIMap);
