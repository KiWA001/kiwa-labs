import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sessionId, message } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Session ID and message are required' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual Supabase integration
    // For now, return success
    
    console.log('Admin sending message:', {
      sessionId,
      message
    });

    return NextResponse.json({ 
      success: true
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
