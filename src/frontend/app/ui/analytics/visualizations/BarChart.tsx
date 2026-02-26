'use client';

import {
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart as ReBarChart,
} from 'recharts';

interface SeriesDef {
  key: string;
  label: string;
  colorVar: string;
}

interface BarChartProps {
  title: string;
  data: Array<Record<string, string | number>>;
  series: SeriesDef[];
  activeSeries: string[];
}

function formatCategory(label: string): string {
  return label.length > 14 ? `${label.slice(0, 14)}…` : label;
}

function formatValue(value: number): string {
  return Math.abs(value) >= 1000 ? value.toLocaleString() : value.toFixed(2);
}

function tooltipFormatter(value: number | string | undefined): string {
  if (typeof value === 'number') return formatValue(value);
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) return formatValue(asNumber);
    return value;
  }
  return '--';
}

export default function BarChart({ title, data, series, activeSeries }: BarChartProps) {
  const visibleSeries = series.filter((item) => activeSeries.includes(item.key));

  if (visibleSeries.length === 0) {
    return (
      <div className="glass-panel-nested rounded-xl p-4 text-sm text-base-content/70">
        Select at least one series to display this breakdown chart.
      </div>
    );
  }

  return (
    <div className="glass-panel-nested rounded-xl p-3 md:p-4 animate-fade-up-fast">
      <div className="text-xs text-base-content/60 uppercase tracking-wide mb-2">{title}</div>
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: 'var(--color-base-content)' }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={56}
              tickFormatter={(value) => formatCategory(String(value))}
            />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-base-content)' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid var(--color-base-300)',
                backgroundColor: 'var(--color-base-100)',
                boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
              }}
              formatter={(value) => tooltipFormatter(value as number | string | undefined)}
            />
            {visibleSeries.map((item) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                fill={item.colorVar}
                radius={[7, 7, 0, 0]}
                animationDuration={420}
              />
            ))}
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
