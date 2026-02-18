import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return empty array for now - will implement with Supabase later
    return NextResponse.json({ 
      sessions: [],
      message: 'Admin endpoint ready'
    });
  } catch (error) {
    console.error('Admin fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
