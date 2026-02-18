import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { sessionId, messages, timestamp, status, contactInfo } = await request.json();

    if (!sessionId || !messages) {
      return NextResponse.json(
        { error: 'Session ID and messages are required' },
        { status: 400 }
      );
    }

    // Upsert the chat session
    const { data, error } = await supabase
      .from('chat_sessions')
      .upsert({
        session_id: sessionId,
        messages: messages,
        contact_info: contactInfo || null,
        status: status || 'active',
        last_updated: timestamp || new Date().toISOString(),
      }, {
        onConflict: 'session_id'
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Save chat error:', error);
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
}
