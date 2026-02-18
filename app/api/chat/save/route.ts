import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sessionId, messages, timestamp, status, contactInfo } = await request.json();

    if (!sessionId || !messages) {
      return NextResponse.json(
        { error: 'Session ID and messages are required' },
        { status: 400 }
      );
    }

    // Log the conversation for now
    console.log('Saving conversation:', {
      sessionId,
      messageCount: messages.length,
      status,
      contactInfo,
      timestamp
    });

    return NextResponse.json({ 
      success: true
    });
  } catch (error) {
    console.error('Save chat error:', error);
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
}
