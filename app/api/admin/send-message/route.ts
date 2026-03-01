import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export async function POST(request: Request) {
  try {
    const { sessionId, message } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Session ID and message are required' },
        { status: 400 }
      );
    }

    // Fetch current session first
    const { data: sessionData, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('messages')
      .eq('session_id', sessionId)
      .single();

    if (fetchError || !sessionData) {
      console.error('Session fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const currentMessages = sessionData.messages || [];
    
    // Ensure the message has ID and timestamp if missing
    const newMsg = {
      ...message,
      id: message.id || Date.now().toString(),
      role: 'admin',
      timestamp: message.timestamp || new Date().toISOString()
    };

    const updatedMessages = [...currentMessages, newMsg];

    // Update session
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ 
        messages: updatedMessages,
        last_updated: newMsg.timestamp
      })
      .eq('session_id', sessionId)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to send message', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      data 
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
