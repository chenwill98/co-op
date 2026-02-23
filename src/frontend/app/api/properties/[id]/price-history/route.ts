import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const history = await prisma.$queryRaw<{ date: Date; price: { toNumber(): number } }[]>`
      SELECT date, price
      FROM real_estate.fct_properties
      WHERE id = ${id}
      ORDER BY date ASC
    `;

    const formatted = history.map((row) => ({
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
      price: typeof row.price === 'object' && row.price !== null && 'toNumber' in row.price
        ? row.price.toNumber()
        : Number(row.price),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('[API price-history] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}
