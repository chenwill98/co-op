'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection, Point } from 'geojson';

import 'mapbox-gl/dist/mapbox-gl.css';

type MapMode = 'heatmap' | 'bubble';

interface MapPoint {
  latitude: number;
  longitude: number;
  weight?: number;
  label?: string;
}

interface PointHeatmapMapProps {
  points: MapPoint[];
  mode: MapMode;
  dataVersion: string;
}

const SOURCE_ID = 'analytics-points';
const LAYER_ID = 'analytics-layer';

function addLayerForMode(map: mapboxgl.Map, mode: MapMode): void {
  if (map.getLayer(LAYER_ID)) {
    map.removeLayer(LAYER_ID);
  }

  if (mode === 'heatmap') {
    map.addLayer({
      id: LAYER_ID,
      type: 'heatmap',
      source: SOURCE_ID,
      paint: {
        'heatmap-intensity': 0.85,
        'heatmap-weight': ['coalesce', ['get', 'weight'], 1],
        'heatmap-radius': 24,
        'heatmap-opacity': 0.82,
      },
    });
    return;
  }

  map.addLayer({
    id: LAYER_ID,
    type: 'circle',
    source: SOURCE_ID,
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'weight'], 1],
        1,
        4,
        10000,
        20,
      ],
      'circle-color': '#b45309',
      'circle-opacity': 0.76,
      'circle-stroke-width': 1.4,
      'circle-stroke-color': '#fff8',
    },
  });
}

function fitToPoints(map: mapboxgl.Map, points: MapPoint[]) {
  if (points.length === 0) return;

  const bounds = new mapboxgl.LngLatBounds();
  for (const point of points) {
    bounds.extend([point.longitude, point.latitude]);
  }

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 52, maxZoom: 13, duration: 420 });
  }
}

export default function PointHeatmapMap({ points, mode, dataVersion }: PointHeatmapMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const loadedRef = useRef(false);
  const latestGeojsonRef = useRef<FeatureCollection<Point>>({ type: 'FeatureCollection', features: [] });
  const modeRef = useRef<MapMode>(mode);
  const layerModeRef = useRef<MapMode | null>(null);
  const lastFittedVersionRef = useRef<string>('');

  const [currentMode, setCurrentMode] = useState<MapMode>(mode);

  const token = process.env.MAPBOX_TOKEN;

  const geojson = useMemo<FeatureCollection<Point>>(() => {
    const features: Feature<Point>[] = points.map((point) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude],
      },
      properties: {
        weight: point.weight ?? 1,
        label: point.label ?? '',
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [points]);

  useEffect(() => {
    latestGeojsonRef.current = geojson;
  }, [geojson]);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    modeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    if (!mapContainerRef.current || !token || mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-73.95, 40.73],
      zoom: 10,
    });

    mapRef.current = map;

    map.on('load', () => {
      loadedRef.current = true;

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: latestGeojsonRef.current,
        });
      }

      addLayerForMode(map, modeRef.current);
      layerModeRef.current = modeRef.current;
    });

    return () => {
      loadedRef.current = false;
      layerModeRef.current = null;
      lastFittedVersionRef.current = '';
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    }

    if (layerModeRef.current !== currentMode) {
      addLayerForMode(map, currentMode);
      layerModeRef.current = currentMode;
    }

    if (points.length > 0 && dataVersion && lastFittedVersionRef.current !== dataVersion) {
      fitToPoints(map, points);
      lastFittedVersionRef.current = dataVersion;
    }
  }, [currentMode, dataVersion, geojson, points]);

  const handleResetView = useCallback(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || points.length === 0) return;
    fitToPoints(map, points);
  }, [points]);

  if (!token) {
    return (
      <div className="glass-badge-warning rounded-xl px-4 py-4 text-sm">
        Map rendering requires MAPBOX_TOKEN.
      </div>
    );
  }

  return (
    <div className="glass-panel-nested rounded-xl relative p-2">
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 glass-panel-nested rounded-xl px-2 py-1.5 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setCurrentMode('heatmap')}
          className={`glass-chip ${currentMode === 'heatmap' ? 'glass-chip-active' : ''}`}
        >
          Heatmap
        </button>
        <button
          type="button"
          onClick={() => setCurrentMode('bubble')}
          className={`glass-chip ${currentMode === 'bubble' ? 'glass-chip-active' : ''}`}
        >
          Bubble
        </button>
        <button
          type="button"
          onClick={handleResetView}
          className="glass-chip"
        >
          Reset view
        </button>
      </div>

      {currentMode === 'bubble' && (
        <div className="absolute bottom-3 left-3 z-20 glass-panel-nested rounded-full px-2.5 py-1 text-[11px] text-base-content/70">
          Bubble size indicates relative weight
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-80 rounded-lg overflow-hidden border border-base-300/45" />
    </div>
  );
}
