export type ComparisonTier = 'favorable' | 'neutral' | 'unfavorable';

export interface ComparisonResult {
  diff: number;
  absDiff: number;
  pctDiff: number;
  tier: ComparisonTier;
  colorClass: string;
}

/**
 * Compare a value against a baseline and return a 3-tier result.
 *
 * @param value - The value to compare (e.g., listing price, DOM)
 * @param baseline - The baseline to compare against (e.g., median price)
 * @param options.thresholdPercent - Fraction of baseline defining the neutral zone (default 0.10 = ±10%)
 * @param options.lowerIsBetter - When true (default), being below baseline is "favorable"
 * @returns ComparisonResult or null if inputs are invalid
 */
export function compareToBaseline(
  value: number,
  baseline: number,
  options?: {
    thresholdPercent?: number;
    lowerIsBetter?: boolean;
  }
): ComparisonResult | null {
  if (baseline === 0 || !isFinite(value) || !isFinite(baseline)) return null;

  const threshold = options?.thresholdPercent ?? 0.10;
  const lowerIsBetter = options?.lowerIsBetter ?? true;

  const diff = value - baseline;
  const absDiff = Math.abs(diff);
  const pctDiff = diff / baseline;

  let tier: ComparisonTier;
  if (Math.abs(pctDiff) <= threshold) {
    tier = 'neutral';
  } else if (lowerIsBetter ? diff < 0 : diff > 0) {
    tier = 'favorable';
  } else {
    tier = 'unfavorable';
  }

  const colorMap: Record<ComparisonTier, string> = {
    favorable: 'text-success',
    neutral: 'text-base-content/70',
    unfavorable: 'text-warning',
  };

  return { diff, absDiff, pctDiff, tier, colorClass: colorMap[tier] };
}

/**
 * Build a consistent comparison label like "Median 1BR in East Village".
 */
export function formatComparisonLabel(
  bedrooms: number | null | undefined,
  neighborhood: string,
  formatNeighborhood: (text: string) => string
): string {
  const bedroomLabel = bedrooms === 0 ? 'studio' : `${bedrooms}BR`;
  return `Median ${bedroomLabel} in ${formatNeighborhood(neighborhood)}`;
}

/**
 * Return a warning message if sample size is too small, or null if it's adequate.
 */
export function getSampleSizeWarning(
  count: number | null | undefined,
  threshold: number = 5
): string | null {
  if (count == null) return null;
  if (count < threshold) {
    return `Based on only ${count} active listing${count !== 1 ? 's' : ''} — interpret with caution`;
  }
  return null;
}
