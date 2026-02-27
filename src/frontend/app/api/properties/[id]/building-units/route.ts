import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First get the property's building_id
    const property = await prisma.latest_properties_materialized.findFirst({
      where: { fct_id: id },
      select: { building_id: true },
    });

    if (!property?.building_id) {
      return NextResponse.json([]);
    }

    type UnitRow = {
      id: string;
      address: string;
      price: { toNumber(): number } | number;
      bedrooms: number | null;
      bathrooms: { toNumber(): number } | number | null;
      sqft: number | null;
      no_fee: boolean;
      thumbnail_image: string | null;
    };

    const units = await prisma.$queryRaw<UnitRow[]>`
      SELECT id, address, price, bedrooms, bathrooms, sqft, no_fee, images[1] as thumbnail_image
      FROM real_estate.latest_properties_materialized
      WHERE building_id = ${property.building_id} AND fct_id != ${id}
      ORDER BY price ASC
    `;

    const formatted = units.map((unit) => ({
      ...unit,
      price: typeof unit.price === 'object' && unit.price !== null && 'toNumber' in unit.price
        ? unit.price.toNumber()
        : Number(unit.price),
      bathrooms: unit.bathrooms != null
        ? (typeof unit.bathrooms === 'object' && unit.bathrooms !== null && 'toNumber' in unit.bathrooms
          ? unit.bathrooms.toNumber()
          : Number(unit.bathrooms))
        : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('[API building-units] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch building units' },
      { status: 500 }
    );
  }
}
