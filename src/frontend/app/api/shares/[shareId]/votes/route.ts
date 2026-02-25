import { NextResponse } from 'next/server';
import { getVotes } from '@/app/lib/dynamodb-shares';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || undefined;

    const votes = await getVotes(shareId, sessionId);

    return NextResponse.json({ votes });
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    );
  }
}
