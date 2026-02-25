import { NextResponse } from 'next/server';
import { getShare, castVote } from '@/app/lib/dynamodb-shares';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const body = await request.json();
    const { propertyId, direction, sessionId } = body;

    // Validation
    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json(
        { error: 'propertyId is required' },
        { status: 400 }
      );
    }

    if (!['up', 'down', 'none'].includes(direction)) {
      return NextResponse.json(
        { error: 'direction must be "up", "down", or "none"' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Verify share exists and property is in the share
    const share = await getShare(shareId);
    if (!share) {
      return NextResponse.json(
        { error: 'Share not found or expired' },
        { status: 404 }
      );
    }

    if (!share.propertyIds.includes(propertyId)) {
      return NextResponse.json(
        { error: 'Property not in this share' },
        { status: 400 }
      );
    }

    const result = await castVote(shareId, propertyId, direction, sessionId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    );
  }
}
