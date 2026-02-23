import { describe, it, expect, vi } from 'vitest';

// Mock the data module to avoid database calls in getAllChildNeighborhoods
vi.mock('../data', () => ({
  getAllChildNeighborhoods: vi.fn(async (name: string) => [{ name }]),
}));

// Mock @prisma/client for Prisma.sql, Prisma.raw, etc.
vi.mock('@prisma/client', () => {
  const createSqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings: Array.from(strings),
    values,
  });
  return {
    Prisma: {
      sql: createSqlTag,
      raw: (s: string) => ({ raw: s }),
      empty: { strings: [''], values: [] },
      join: (arr: unknown[]) => arr,
    },
  };
});

import {
  parseClaudeResultsToPrismaQuery,
  parseClaudeResultsToPrismaSQL,
} from '../claudeQueryParser';

describe('parseClaudeResultsToPrismaQuery', () => {
  it('generates equals=0 for studio search (bedrooms min:0, max:0)', async () => {
    const [where] = await parseClaudeResultsToPrismaQuery({
      bedrooms: { min: 0, max: 0 },
    });
    expect(where.bedrooms).toEqual({ equals: 0 });
  });

  it('generates range filter for bedrooms min:1, max:3', async () => {
    const [where] = await parseClaudeResultsToPrismaQuery({
      bedrooms: { min: 1, max: 3 },
    });
    expect(where.bedrooms).toEqual({ gte: 1, lte: 3 });
  });

  it('generates only max constraint for price with null min', async () => {
    const [where] = await parseClaudeResultsToPrismaQuery({
      price: { min: null, max: 3000 },
    });
    expect(where.price).toEqual({ lte: 3000 });
  });

  it('generates only min constraint when max is null', async () => {
    const [where] = await parseClaudeResultsToPrismaQuery({
      sqft: { min: 800, max: null },
    });
    expect(where.sqft).toEqual({ gte: 800 });
  });

  it('generates equals for same non-zero min and max', async () => {
    const [where] = await parseClaudeResultsToPrismaQuery({
      bathrooms: { min: 2, max: 2 },
    });
    expect(where.bathrooms).toEqual({ equals: 2 });
  });

  it('skips range filter when both min and max are null', async () => {
    const [where] = await parseClaudeResultsToPrismaQuery({
      bedrooms: { min: null, max: null },
    });
    expect(where.bedrooms).toBeUndefined();
  });
});

describe('parseClaudeResultsToPrismaSQL', () => {
  // Recursively find all Prisma.raw() values from the nested mock structure
  function extractRawStrings(obj: unknown): string[] {
    if (obj == null || typeof obj !== 'object') return [];
    const o = obj as Record<string, unknown>;
    if ('raw' in o && typeof o.raw === 'string') return [o.raw];
    const results: string[] = [];
    if ('values' in o && Array.isArray(o.values)) {
      for (const v of o.values) results.push(...extractRawStrings(v));
    }
    return results;
  }

  function extractWhereParts(sql: unknown): string {
    return extractRawStrings(sql).join(' ');
  }

  it('generates bedrooms = 0 for studio search', async () => {
    const [sql] = await parseClaudeResultsToPrismaSQL({
      bedrooms: { min: 0, max: 0 },
    });
    const where = extractWhereParts(sql);
    expect(where).toContain('bedrooms = 0');
  });

  it('generates range constraints for bedrooms min:1, max:3', async () => {
    const [sql] = await parseClaudeResultsToPrismaSQL({
      bedrooms: { min: 1, max: 3 },
    });
    const where = extractWhereParts(sql);
    expect(where).toContain('bedrooms >= 1');
    expect(where).toContain('bedrooms <= 3');
  });

  it('generates only max constraint for price with null min', async () => {
    const [sql] = await parseClaudeResultsToPrismaSQL({
      price: { min: null, max: 3000 },
    });
    const where = extractWhereParts(sql);
    expect(where).toContain('price <= 3000');
    expect(where).not.toContain('price >=');
  });
});
