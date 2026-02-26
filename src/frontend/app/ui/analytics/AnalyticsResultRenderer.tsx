'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AnalyticsRenderHint,
  AnalyticsResultColumn,
  AnalyticsResultRow,
  AnalyticsTabularResult,
} from '@/app/lib/analytics/types';
import MetricCard from './visualizations/MetricCard';
import DynamicTable from './visualizations/DynamicTable';
import BarChart from './visualizations/BarChart';
import LineChart from './visualizations/LineChart';
import PointHeatmapMap from './visualizations/PointHeatmapMap';

type ViewMode = 'metric' | 'table' | 'bar' | 'line' | 'heatmap' | 'map_bubble';
type Timeframe = '3M' | '6M' | '12M' | 'All';

type SeriesDef = {
  key: string;
  label: string;
  colorVar: string;
};

interface AnalyticsResultRendererProps {
  result: AnalyticsTabularResult;
  renderHint: AnalyticsRenderHint;
  messageId?: string;
}

const SERIES_COLORS = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-accent)'];
const TOOLBAR_CLASS = 'flex flex-wrap items-center gap-1.5 glass-panel-nested rounded-xl p-2';

function toNumber(value: AnalyticsResultRow[string]): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function findCategoryColumn(columns: AnalyticsResultColumn[]): AnalyticsResultColumn | null {
  return columns.find((column) => column.type !== 'number' && column.key !== 'latitude' && column.key !== 'longitude') ?? null;
}

function formatViewLabel(view: ViewMode): string {
  return view.replace('_', ' ');
}

function isDateLike(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

export default function AnalyticsResultRenderer({
  result,
  renderHint,
  messageId,
}: AnalyticsResultRendererProps) {
  const hasRows = result.columns.length > 0 && result.rows.length > 0;

  const numericColumns = useMemo(
    () => result.columns.filter((column) => column.type === 'number' && column.key !== 'latitude' && column.key !== 'longitude'),
    [result.columns]
  );
  const categoryColumn = useMemo(() => findCategoryColumn(result.columns), [result.columns]);
  const hasGeoColumns = useMemo(
    () => result.columns.some((column) => column.key === 'latitude') && result.columns.some((column) => column.key === 'longitude'),
    [result.columns]
  );
  const hasMonthAxis = useMemo(() => result.columns.some((column) => column.key === 'month'), [result.columns]);

  const seriesDefs = useMemo<SeriesDef[]>(
    () =>
      numericColumns.map((column, index) => ({
        key: column.key,
        label: column.label,
        colorVar: SERIES_COLORS[index % SERIES_COLORS.length],
      })),
    [numericColumns]
  );

  const defaultViews = useMemo<ViewMode[]>(() => {
    if (!hasRows) return ['table'];

    if (hasGeoColumns) {
      return ['heatmap', 'map_bubble', 'table'];
    }

    if (hasMonthAxis && seriesDefs.length > 0) {
      return ['line', 'table'];
    }

    if (categoryColumn && seriesDefs.length > 0) {
      return ['bar', 'table'];
    }

    if (seriesDefs.length > 0) {
      return ['metric', 'table'];
    }

    return ['table'];
  }, [hasRows, hasGeoColumns, hasMonthAxis, categoryColumn, seriesDefs.length]);

  const availableViews = useMemo<ViewMode[]>(() => {
    const set = new Set<ViewMode>(defaultViews);
    if (set.has(renderHint.primary as ViewMode)) {
      return defaultViews;
    }

    if (renderHint.primary !== 'table' && renderHint.primary !== 'metric' && !hasRows) {
      return ['table'];
    }

    return [renderHint.primary as ViewMode, ...defaultViews.filter((view) => view !== renderHint.primary)];
  }, [defaultViews, hasRows, renderHint.primary]);

  const [selectedView, setSelectedView] = useState<ViewMode>(availableViews[0] ?? 'table');
  const [timeframe, setTimeframe] = useState<Timeframe>('All');
  const [activeSeries, setActiveSeries] = useState<string[]>(seriesDefs.map((series) => series.key));

  useEffect(() => {
    setSelectedView((prev) => (availableViews.includes(prev) ? prev : availableViews[0] ?? 'table'));
  }, [availableViews, messageId]);

  useEffect(() => {
    setActiveSeries(seriesDefs.map((series) => series.key));
  }, [seriesDefs]);

  const lineData = useMemo(() => {
    if (!hasMonthAxis || seriesDefs.length === 0) return [] as Array<Record<string, string | number>>;

    const rows = result.rows
      .map((row) => {
        const xValue = String(row.month ?? row[categoryColumn?.key ?? ''] ?? '');
        const payload: Record<string, string | number> = {
          xLabel: xValue,
        };

        for (const series of seriesDefs) {
          payload[series.key] = toNumber(row[series.key]) ?? 0;
        }

        return payload;
      })
      .filter((row) => row.xLabel);

    if (rows.length === 0) return rows;

    const sorted = [...rows].sort((a, b) => {
      const left = String(a.xLabel);
      const right = String(b.xLabel);
      if (isDateLike(left) && isDateLike(right)) {
        return new Date(left).getTime() - new Date(right).getTime();
      }
      return left.localeCompare(right);
    });

    if (timeframe === 'All') return sorted;

    const months = timeframe === '3M' ? 3 : timeframe === '6M' ? 6 : 12;
    return sorted.slice(-months);
  }, [hasMonthAxis, seriesDefs, result.rows, categoryColumn, timeframe]);

  const barData = useMemo(() => {
    if (!categoryColumn || seriesDefs.length === 0) return [] as Array<Record<string, string | number>>;

    return result.rows.slice(0, 20).map((row) => {
      const payload: Record<string, string | number> = {
        category: String(row[categoryColumn.key] ?? '--'),
      };

      for (const series of seriesDefs) {
        payload[series.key] = toNumber(row[series.key]) ?? 0;
      }

      return payload;
    });
  }, [categoryColumn, seriesDefs, result.rows]);

  const mapPoints = useMemo(() => {
    if (!hasGeoColumns) return [] as Array<{ latitude: number; longitude: number; weight: number; label?: string }>;

    const primarySeries = seriesDefs[0];

    return result.rows
      .map((row) => {
        const latitude = toNumber(row.latitude);
        const longitude = toNumber(row.longitude);

        if (latitude == null || longitude == null) {
          return null;
        }

        const weight = primarySeries ? toNumber(row[primarySeries.key]) ?? 1 : 1;

        return {
          latitude,
          longitude,
          weight,
          ...(typeof row.neighborhood === 'string' ? { label: row.neighborhood } : {}),
        };
      })
      .filter((point): point is { latitude: number; longitude: number; weight: number; label?: string } => point !== null);
  }, [hasGeoColumns, result.rows, seriesDefs]);

  const mapDataVersion = useMemo(() => {
    if (!hasGeoColumns) return '';
    if (messageId) return messageId;

    const first = result.rows[0];
    const last = result.rows[result.rows.length - 1];
    return `${result.rowCount}:${JSON.stringify(first)}:${JSON.stringify(last)}`;
  }, [hasGeoColumns, messageId, result.rowCount, result.rows]);

  const metricSeries = useMemo(() => {
    if (activeSeries.length > 0) {
      return seriesDefs.find((series) => series.key === activeSeries[0]) ?? seriesDefs[0];
    }
    return seriesDefs[0];
  }, [activeSeries, seriesDefs]);

  const metricValue = metricSeries
    ? toNumber(result.rows[0]?.[metricSeries.key])
    : null;

  const canRenderSeriesToggle = (selectedView === 'line' || selectedView === 'bar') && seriesDefs.length > 1;

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
  };

  if (!hasRows) {
    return (
      <div className="glass-panel-nested rounded-xl p-3 text-sm text-base-content/70">
        No rows returned.
      </div>
    );
  }

  const showTableFallback =
    (selectedView === 'metric' && !metricSeries) ||
    (selectedView === 'line' && lineData.length === 0) ||
    (selectedView === 'bar' && barData.length === 0) ||
    ((selectedView === 'heatmap' || selectedView === 'map_bubble') && mapPoints.length === 0);

  return (
    <div className="space-y-3">
      <div className={TOOLBAR_CLASS}>
        <span className="text-[11px] uppercase tracking-wide text-base-content/60">View</span>
        {availableViews.map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setSelectedView(view)}
            className={`glass-chip ${selectedView === view ? 'glass-chip-active' : ''}`}
          >
            {formatViewLabel(view)}
          </button>
        ))}

        {selectedView === 'line' && (
          <>
            <span className="ml-2 text-[11px] uppercase tracking-wide text-base-content/60">Range</span>
            {(['3M', '6M', '12M', 'All'] as Timeframe[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTimeframe(option)}
                className={`glass-chip ${timeframe === option ? 'glass-chip-active' : ''}`}
              >
                {option}
              </button>
            ))}
          </>
        )}
      </div>

      {canRenderSeriesToggle && (
        <div className={TOOLBAR_CLASS}>
          <span className="text-[11px] uppercase tracking-wide text-base-content/60">Series</span>
          {seriesDefs.map((series) => {
            const active = activeSeries.includes(series.key);
            return (
              <button
                key={series.key}
                type="button"
                onClick={() => toggleSeries(series.key)}
                className={`glass-chip ${active ? 'glass-chip-active' : ''}`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1"
                  style={{ backgroundColor: series.colorVar }}
                />
                {series.label}
              </button>
            );
          })}
        </div>
      )}

      {selectedView === 'metric' && metricSeries && (
        <MetricCard
          label={metricSeries.label}
          subtitle="Current aggregate snapshot"
          value={metricValue}
        />
      )}

      {selectedView === 'line' && lineData.length > 0 && (
        <LineChart
          title="Trend"
          data={lineData}
          series={seriesDefs}
          activeSeries={activeSeries}
        />
      )}

      {selectedView === 'bar' && barData.length > 0 && (
        <BarChart
          title="Breakdown"
          data={barData}
          series={seriesDefs}
          activeSeries={activeSeries}
        />
      )}

      {(selectedView === 'heatmap' || selectedView === 'map_bubble') && mapPoints.length > 0 && (
        <PointHeatmapMap
          points={mapPoints}
          mode={selectedView === 'heatmap' ? 'heatmap' : 'bubble'}
          dataVersion={mapDataVersion}
        />
      )}

      {(selectedView === 'table' || showTableFallback) && (
        <DynamicTable columns={result.columns} rows={result.rows} />
      )}
    </div>
  );
}
