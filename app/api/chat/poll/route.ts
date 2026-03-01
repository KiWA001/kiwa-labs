import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

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

    // Fetch entire session to check sizes
    const { data: sessionData, error } = await supabase
      .from('chat_sessions')
      .select('messages')
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore row not found error
      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      messages: sessionData?.messages || [],
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
