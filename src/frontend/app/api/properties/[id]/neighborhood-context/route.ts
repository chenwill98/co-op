import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First get the property's neighborhood and bedrooms
    const property = await prisma.latest_properties_materialized.findFirst({
      where: { fct_id: id },
      select: { neighborhood: true, bedrooms: true },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const neighborhood = property.neighborhood;
    const bedrooms = property.bedrooms ?? 0;

    type ContextRow = {
      median_price: { toNumber(): number } | number | null;
      avg_days_on_market: { toNumber(): number } | number | null;
      active_listing_count: bigint | number | null;
      avg_days_to_rent: { toNumber(): number } | number | null;
    };

    const result = await prisma.$queryRaw<ContextRow[]>`
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
        AVG(days_on_market) AS avg_days_on_market,
        COUNT(*) AS active_listing_count,
        (SELECT AVG(days_on_market)
         FROM real_estate.dim_property_details
         WHERE neighborhood = ${neighborhood} AND bedrooms = ${bedrooms}
         AND status = 'closed' AND closed_at > NOW() - INTERVAL '90 days'
        ) AS avg_days_to_rent
      FROM real_estate.latest_properties_materialized
      WHERE neighborhood = ${neighborhood} AND bedrooms = ${bedrooms}
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({
        median_price: null,
        avg_days_on_market: null,
        active_listing_count: null,
        avg_days_to_rent: null,
      });
    }

    const row = result[0];

    const toNum = (val: unknown): number | null => {
      if (val == null) return null;
      if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return (val as { toNumber(): number }).toNumber();
      }
      if (typeof val === 'bigint') return Number(val);
      return typeof val === 'number' ? val : null;
    };

    return NextResponse.json({
      median_price: toNum(row.median_price),
      avg_days_on_market: toNum(row.avg_days_on_market),
      active_listing_count: toNum(row.active_listing_count),
      avg_days_to_rent: toNum(row.avg_days_to_rent),
    });
  } catch (error) {
    console.error('[API neighborhood-context] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch neighborhood context' },
      { status: 500 }
    );
  }
}
