import { describe, it, expect } from 'vitest';
import { getLevel } from './DealScoreSummary';

describe('getLevel', () => {
  describe('tier boundaries', () => {
    it('returns "below" for percentile < 25', () => {
      expect(getLevel(0)).toBe('below');
      expect(getLevel(10)).toBe('below');
      expect(getLevel(24)).toBe('below');
    });

    it('returns "average" for percentile 25-49', () => {
      expect(getLevel(25)).toBe('average');
      expect(getLevel(37)).toBe('average');
      expect(getLevel(49)).toBe('average');
    });

    it('returns "good" for percentile 50-74', () => {
      expect(getLevel(50)).toBe('good');
      expect(getLevel(60)).toBe('good');
      expect(getLevel(74)).toBe('good');
    });

    it('returns "great" for percentile >= 75', () => {
      expect(getLevel(75)).toBe('great');
      expect(getLevel(90)).toBe('great');
      expect(getLevel(100)).toBe('great');
    });
  });

  describe('null handling', () => {
    it('returns null for null', () => {
      expect(getLevel(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(getLevel(undefined)).toBeNull();
    });
  });

  describe('price inversion pattern', () => {
    // DealScoreSummary inverts price percentile: 100 - percentile
    // A high price_neighborhood_percentile (80) means expensive → inverted to 20 → "below"
    it('high price percentile inverts to "below" level', () => {
      const pricePercentile = 80;
      expect(getLevel(100 - pricePercentile)).toBe('below');
    });

    // A low price_neighborhood_percentile (15) means cheap → inverted to 85 → "great"
    it('low price percentile inverts to "great" level', () => {
      const pricePercentile = 15;
      expect(getLevel(100 - pricePercentile)).toBe('great');
    });
  });
});
