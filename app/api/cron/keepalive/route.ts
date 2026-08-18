import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Simple read operation to keep the database awake
    const { error } = await supabase
      .from('leads')
      .select('leadId')
      .limit(1);
      
    if (error) {
      console.error("Keepalive error:", error.message);
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ status: 'ok', message: 'Database is awake' });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
