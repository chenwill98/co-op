import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { toNum } from '@/app/lib/dbUtils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    type ContextRow = {
      median_price: { toNumber(): number } | number | null;
      median_days_on_market: { toNumber(): number } | number | null;
      active_listing_count: bigint | number | null;
      median_days_to_rent: { toNumber(): number } | number | null;
    };

    const result = await prisma.$queryRaw<ContextRow[]>`
      WITH prop AS (
        SELECT neighborhood, bedrooms
        FROM real_estate.latest_properties_materialized
        WHERE fct_id = ${id}
        LIMIT 1
      )
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY lpm.price) AS median_price,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY lpm.days_on_market) AS median_days_on_market,
        COUNT(*) AS active_listing_count,
        (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dpd.days_on_market)
         FROM real_estate.dim_property_details dpd, prop p2
         WHERE dpd.neighborhood = p2.neighborhood AND dpd.bedrooms = p2.bedrooms
         AND dpd.status = 'closed' AND dpd.closed_at > NOW() - INTERVAL '90 days'
        ) AS median_days_to_rent
      FROM real_estate.latest_properties_materialized lpm, prop
      WHERE lpm.neighborhood = prop.neighborhood AND lpm.bedrooms = prop.bedrooms
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({
        median_price: null,
        median_days_on_market: null,
        active_listing_count: null,
        median_days_to_rent: null,
      });
    }

    const row = result[0];

    return NextResponse.json({
      median_price: toNum(row.median_price),
      median_days_on_market: toNum(row.median_days_on_market),
      active_listing_count: toNum(row.active_listing_count),
      median_days_to_rent: toNum(row.median_days_to_rent),
    });
  } catch (error) {
    console.error('[API neighborhood-context] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch neighborhood context' },
      { status: 500 }
    );
  }
}
