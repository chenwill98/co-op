import { NextResponse } from 'next/server';
import { getShare, updateShare } from '@/app/lib/dynamodb-shares';
import { fetchPropertiesByIds } from '@/app/lib/data';
import prisma from '@/app/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const share = await getShare(shareId);

    if (!share) {
      return NextResponse.json(
        { error: 'Share not found or expired' },
        { status: 404 }
      );
    }

    const properties = await fetchPropertiesByIds(share.propertyIds);

    return NextResponse.json({
      properties,
      votes: share.votes,
      createdAt: share.createdAt,
      totalPropertyCount: share.propertyIds.length,
    });
  } catch (error) {
    console.error('Error fetching share:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const body = await request.json();
    const { propertyIds } = body;

    // Validation (same rules as POST /api/shares)
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

    // Validate that property IDs actually exist
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

    const updated = await updateShare(shareId, validIds);

    if (!updated) {
      return NextResponse.json(
        { error: 'Share not found or expired' },
        { status: 404 }
      );
    }

    const properties = await fetchPropertiesByIds(validIds);

    return NextResponse.json({
      properties,
      votes: updated.votes,
      createdAt: updated.createdAt,
      totalPropertyCount: validIds.length,
    });
  } catch (error) {
    console.error('Error updating share:', error);
    return NextResponse.json(
      { error: 'Failed to update share' },
      { status: 500 }
    );
  }
}
