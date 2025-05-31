import { NextResponse } from 'next/server';
import { fetchPropertiesRDS } from '../../lib/data';

// POST handler: allows passing params as JSON body for maximum flexibility
export async function POST(request: Request) {
  try {
    const params = await request.json();
    console.log('params', params);
    const data = await fetchPropertiesRDS(params);
    return NextResponse.json({ properties: data[0], queryRecord: data[1], chatHistory: data[2] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}