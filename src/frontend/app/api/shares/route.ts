import { NextResponse } from 'next/server';
import { createShare } from '@/app/lib/dynamodb-shares';
import prisma from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyIds } = body;

    // Validation
    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return NextResponse.json(
        { error: 'propertyIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (propertyIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 properties per share' },
        { status: 400 }
      );
    }

    if (!propertyIds.every((id: unknown) => typeof id === 'string')) {
      return NextResponse.json(
        { error: 'All propertyIds must be strings' },
        { status: 400 }
      );
    }

    // Validate that the property IDs actually exist and filter to only valid ones
    const existingProperties = await prisma.latest_properties_materialized.findMany({
      where: { fct_id: { in: propertyIds } },
      select: { fct_id: true },
    });

    const validIds = existingProperties.map((p) => p.fct_id).filter((id): id is string => id !== null);

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'None of the provided property IDs exist' },
        { status: 400 }
      );
    }

    const shareId = await createShare(validIds);
    const url = `/s/${shareId}`;

    return NextResponse.json({ shareId, url }, { status: 201 });
  } catch (error) {
    console.error('Error creating share:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
}
