import { describe, it, expect } from 'vitest';
import { toNum } from './dbUtils';

describe('toNum', () => {
  it('returns null for null', () => {
    expect(toNum(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(toNum(undefined)).toBeNull();
  });

  it('returns the number for a plain number', () => {
    expect(toNum(42)).toBe(42);
    expect(toNum(3.14)).toBe(3.14);
    expect(toNum(0)).toBe(0);
    expect(toNum(-7)).toBe(-7);
  });

  it('calls .toNumber() on Prisma Decimal-like objects', () => {
    const decimal = { toNumber: () => 99.5 };
    expect(toNum(decimal)).toBe(99.5);
  });

  it('converts bigint to number', () => {
    expect(toNum(BigInt(47))).toBe(47);
    expect(toNum(BigInt(0))).toBe(0);
  });

  it('returns null for non-numeric types', () => {
    expect(toNum('42')).toBeNull();
    expect(toNum(true)).toBeNull();
    expect(toNum({})).toBeNull();
    expect(toNum([])).toBeNull();
  });
});
