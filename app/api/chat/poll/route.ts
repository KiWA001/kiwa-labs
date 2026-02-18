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

    // TODO: Replace with actual Supabase integration
    // Fetch admin messages for this session that haven't been delivered yet
    // Once you provide Supabase credentials, we'll update this
    
    console.log('Polling for admin messages:', sessionId);

    // Placeholder response - return empty array for now
    return NextResponse.json({ 
      adminMessages: [],
      message: 'Polling endpoint ready - awaiting Supabase integration'
    });
  } catch (error) {
    console.error('Poll error:', error);
    return NextResponse.json(
      { error: 'Failed to poll for messages' },
      { status: 500 }
    );
  }
}
