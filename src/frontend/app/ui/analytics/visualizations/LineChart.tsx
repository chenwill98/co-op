'use client';

import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface SeriesDef {
  key: string;
  label: string;
  colorVar: string;
}

interface LineChartProps {
  title: string;
  data: Array<Record<string, string | number>>;
  series: SeriesDef[];
  activeSeries: string[];
}

function formatTick(label: string): string {
  if (!label) return '';
  const maybeDate = new Date(label);
  if (!Number.isNaN(maybeDate.getTime())) {
    return maybeDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return label.length > 12 ? `${label.slice(0, 12)}…` : label;
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

export default function LineChart({ title, data, series, activeSeries }: LineChartProps) {
  const visibleSeries = series.filter((item) => activeSeries.includes(item.key));

  if (visibleSeries.length === 0) {
    return (
      <div className="glass-panel-nested rounded-xl p-4 text-sm text-base-content/70">
        Select at least one series to display this trend chart.
      </div>
    );
  }

  return (
    <div className="glass-panel-nested rounded-xl p-3 md:p-4 animate-fade-up-fast">
      <div className="text-xs text-base-content/60 uppercase tracking-wide mb-2">{title}</div>
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={data} margin={{ top: 14, right: 18, left: 8, bottom: 26 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" />
            <XAxis
              dataKey="xLabel"
              tick={{ fontSize: 11, fill: 'var(--color-base-content)' }}
              interval="preserveStartEnd"
              minTickGap={22}
              tickFormatter={(value) => formatTick(String(value))}
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
              labelFormatter={(label) => String(label)}
            />
            {visibleSeries.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.colorVar}
                strokeWidth={2.6}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
                animationDuration={400}
              />
            ))}
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
