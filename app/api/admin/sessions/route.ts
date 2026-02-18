import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export async function GET() {
  try {
    console.log('Fetching sessions from Supabase...');
    
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: error.message },
        { status: 500 }
      );
    }

    console.log(`Found ${sessions?.length || 0} sessions`);
    
    return NextResponse.json({ 
      sessions: sessions || []
    });
  } catch (error) {
    console.error('Admin fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
