/**
 * Convert Prisma raw-query values (Decimal objects, bigint, number) to plain number | null.
 *
 * Prisma's $queryRaw returns:
 * - Decimal columns as objects with a .toNumber() method
 * - COUNT(*) as bigint
 * - Regular numeric columns as number
 */
export function toNum(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'object' && val !== null && 'toNumber' in val) {
    return (val as { toNumber(): number }).toNumber();
  }
  if (typeof val === 'bigint') return Number(val);
  return typeof val === 'number' ? val : null;
}
