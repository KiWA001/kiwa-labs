import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export async function POST(request: Request) {
  try {
    const { sessionId, messages, timestamp, status, contactInfo } = await request.json();

    console.log('Save API called:', { sessionId, messageCount: messages?.length, status });

    if (!sessionId || !messages) {
      console.error('Missing required fields:', { sessionId, hasMessages: !!messages });
      return NextResponse.json(
        { error: 'Session ID and messages are required' },
        { status: 400 }
      );
    }

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
        { error: 'Failed to save conversation', details: error.message },
        { status: 500 }
      );
    }

    console.log('Successfully saved to Supabase:', data);
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
