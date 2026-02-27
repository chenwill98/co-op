import { describe, it, expect } from 'vitest';
import { compareToBaseline, formatComparisonLabel, getSampleSizeWarning } from './comparisonUtils';

describe('compareToBaseline', () => {
  describe('with lowerIsBetter: true (default)', () => {
    it('returns favorable when value is well below baseline', () => {
      const result = compareToBaseline(2500, 3000);
      expect(result).not.toBeNull();
      expect(result!.tier).toBe('favorable');
      expect(result!.colorClass).toBe('text-success');
      expect(result!.diff).toBe(-500);
      expect(result!.absDiff).toBe(500);
    });

    it('returns neutral when value is within threshold of baseline', () => {
      // 5% above a 3000 baseline = 3150, within default 10% threshold
      const result = compareToBaseline(3150, 3000);
      expect(result).not.toBeNull();
      expect(result!.tier).toBe('neutral');
      expect(result!.colorClass).toBe('text-base-content/70');
    });

    it('returns unfavorable when value is well above baseline', () => {
      const result = compareToBaseline(3500, 3000);
      expect(result).not.toBeNull();
      expect(result!.tier).toBe('unfavorable');
      expect(result!.colorClass).toBe('text-warning');
      expect(result!.diff).toBe(500);
    });

    it('returns neutral when value equals baseline exactly', () => {
      const result = compareToBaseline(3000, 3000);
      expect(result).not.toBeNull();
      expect(result!.tier).toBe('neutral');
      expect(result!.diff).toBe(0);
    });
  });

  describe('boundary conditions at default 10% threshold', () => {
    const baseline = 1000;

    it('at exactly -10% boundary: neutral (<=)', () => {
      // 900 / 1000 = -10% exactly → |pctDiff| = 0.10 → <= 0.10 → neutral
      const result = compareToBaseline(900, baseline);
      expect(result!.tier).toBe('neutral');
    });

    it('just past -10% boundary: favorable', () => {
      const result = compareToBaseline(899, baseline);
      expect(result!.tier).toBe('favorable');
    });

    it('at exactly +10% boundary: neutral (<=)', () => {
      const result = compareToBaseline(1100, baseline);
      expect(result!.tier).toBe('neutral');
    });

    it('just past +10% boundary: unfavorable', () => {
      const result = compareToBaseline(1101, baseline);
      expect(result!.tier).toBe('unfavorable');
    });
  });

  describe('with lowerIsBetter: false', () => {
    it('returns favorable when value is above baseline', () => {
      const result = compareToBaseline(1500, 1000, { lowerIsBetter: false });
      expect(result!.tier).toBe('favorable');
    });

    it('returns unfavorable when value is below baseline', () => {
      const result = compareToBaseline(500, 1000, { lowerIsBetter: false });
      expect(result!.tier).toBe('unfavorable');
    });
  });

  describe('custom threshold', () => {
    it('respects custom thresholdPercent', () => {
      // 15% threshold: 850/1000 = -15% → exactly at boundary → neutral
      const result = compareToBaseline(850, 1000, { thresholdPercent: 0.15 });
      expect(result!.tier).toBe('neutral');

      // Just past: 849/1000 = -15.1% → favorable
      const result2 = compareToBaseline(849, 1000, { thresholdPercent: 0.15 });
      expect(result2!.tier).toBe('favorable');
    });
  });

  describe('edge cases', () => {
    it('returns null when baseline is zero', () => {
      expect(compareToBaseline(100, 0)).toBeNull();
    });

    it('returns null when value is not finite', () => {
      expect(compareToBaseline(Infinity, 100)).toBeNull();
      expect(compareToBaseline(NaN, 100)).toBeNull();
    });

    it('returns null when baseline is not finite', () => {
      expect(compareToBaseline(100, Infinity)).toBeNull();
      expect(compareToBaseline(100, NaN)).toBeNull();
    });

    it('provides pctDiff as a fraction', () => {
      const result = compareToBaseline(1200, 1000);
      expect(result!.pctDiff).toBeCloseTo(0.2);
    });
  });
});

describe('formatComparisonLabel', () => {
  const identity = (s: string) => s;

  it('formats a standard bedroom label', () => {
    expect(formatComparisonLabel(2, 'east-village', identity)).toBe('Median 2BR in east-village');
  });

  it('formats studio (0 bedrooms)', () => {
    expect(formatComparisonLabel(0, 'chelsea', identity)).toBe('Median studio in chelsea');
  });

  it('uses the formatNeighborhood function', () => {
    const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    expect(formatComparisonLabel(1, 'chelsea', titleCase)).toBe('Median 1BR in Chelsea');
  });

  it('handles null bedrooms', () => {
    expect(formatComparisonLabel(null, 'soho', identity)).toBe('Median nullBR in soho');
  });
});

describe('getSampleSizeWarning', () => {
  it('returns null for adequate sample sizes', () => {
    expect(getSampleSizeWarning(10)).toBeNull();
    expect(getSampleSizeWarning(5)).toBeNull();
  });

  it('returns warning for small samples', () => {
    const warning = getSampleSizeWarning(3);
    expect(warning).toContain('3 active listings');
    expect(warning).toContain('caution');
  });

  it('uses singular for 1 listing', () => {
    const warning = getSampleSizeWarning(1);
    expect(warning).toContain('1 active listing');
    expect(warning).not.toContain('listings');
  });

  it('returns null for null/undefined input', () => {
    expect(getSampleSizeWarning(null)).toBeNull();
    expect(getSampleSizeWarning(undefined)).toBeNull();
  });

  it('respects custom threshold', () => {
    expect(getSampleSizeWarning(8, 10)).toContain('caution');
    expect(getSampleSizeWarning(10, 10)).toBeNull();
  });
});
