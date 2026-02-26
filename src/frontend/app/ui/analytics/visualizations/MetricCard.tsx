'use client';

interface MetricCardProps {
  label: string;
  value: number | null;
  subtitle?: string;
  delta?: number | null;
}

function formatMetric(label: string, value: number | null): string {
  if (value == null || Number.isNaN(value)) return '--';

  const lower = label.toLowerCase();
  if (lower.includes('price') || lower.includes('rent') || lower.includes('cost')) {
    return `$${Math.round(value).toLocaleString()}`;
  }

  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }

  return value.toFixed(2);
}

function formatDelta(delta: number | null | undefined): string {
  if (delta == null || Number.isNaN(delta)) return 'No change info';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

export default function MetricCard({ label, value, subtitle, delta }: MetricCardProps) {
  const hasDelta = delta != null && !Number.isNaN(delta);

  return (
    <div className="glass-panel-nested rounded-xl p-4 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-base-content/60">{label}</div>
          <div className="text-3xl md:text-4xl font-bold text-primary mt-2">{formatMetric(label, value)}</div>
          {subtitle && <div className="text-sm text-base-content/70 mt-1">{subtitle}</div>}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            hasDelta
              ? 'glass-badge-primary'
              : 'glass-panel-nested text-base-content/65'
          }`}
        >
          {formatDelta(delta)}
        </span>
      </div>
    </div>
  );
}
