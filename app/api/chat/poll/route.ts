import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Return empty array for now - will implement with Supabase later
    return NextResponse.json({ 
      adminMessages: [],
      message: 'Polling endpoint ready'
    });
  } catch (error) {
    console.error('Poll error:', error);
    return NextResponse.json(
      { error: 'Failed to poll for messages' },
      { status: 500 }
    );
  }
}
