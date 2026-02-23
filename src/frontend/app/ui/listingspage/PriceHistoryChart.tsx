'use client';

import { useState, useEffect } from 'react';
import { PriceHistoryPoint } from '@/app/lib/definitions';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
} from 'recharts';

export default function PriceHistoryChart({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<PriceHistoryPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/properties/${propertyId}/price-history`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load price history');
          setLoading(false);
        }
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="loading loading-spinner loading-sm text-primary" />
        <span className="ml-2 text-sm text-base-content/60">Loading price history...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-error py-2">{error}</div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-base-content/60 py-2">No price history available</div>;
  }

  if (data.length === 1) {
    return (
      <div className="text-sm text-base-content/60 py-2">
        No price history yet &mdash; listed at ${data[0].price.toLocaleString()} on {data[0].date}
      </div>
    );
  }

  // Compute price delta
  const firstPrice = data[0].price;
  const lastPrice = data[data.length - 1].price;
  const priceDelta = lastPrice - firstPrice;

  // Find price change points for annotations
  const changePoints: { date: string; price: number; direction: 'up' | 'down' }[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].price !== data[i - 1].price) {
      changePoints.push({
        date: data[i].date,
        price: data[i].price,
        direction: data[i].price > data[i - 1].price ? 'up' : 'down',
      });
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPrice = (price: number) => `$${price.toLocaleString()}`;

  return (
    <div className="glass-panel-nested rounded-lg p-3">
      <div className="flex flex-row items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wide text-base-content/60">Price History</h3>
        {priceDelta !== 0 && (
          <span className={`text-xs font-medium ${priceDelta < 0 ? 'text-success' : 'text-error'}`}>
            {priceDelta < 0 ? '\u2193' : '\u2191'} ${Math.abs(priceDelta).toLocaleString()} from original
          </span>
        )}
        {priceDelta === 0 && (
          <span className="text-xs text-base-content/50">Price unchanged</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: 'oklch(var(--bc) / 0.5)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatPrice}
            tick={{ fontSize: 11, fill: 'oklch(var(--bc) / 0.5)' }}
            axisLine={false}
            tickLine={false}
            width={70}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(value) => [formatPrice(Number(value)), 'Price']}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{
              backgroundColor: 'oklch(var(--b1))',
              border: '1px solid oklch(var(--bc) / 0.1)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Line
            type="stepAfter"
            dataKey="price"
            stroke="oklch(var(--p))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'oklch(var(--p))' }}
          />
          {changePoints.map((cp, i) => (
            <ReferenceDot
              key={i}
              x={cp.date}
              y={cp.price}
              r={4}
              fill={cp.direction === 'down' ? 'oklch(var(--su))' : 'oklch(var(--er))'}
              stroke="none"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
