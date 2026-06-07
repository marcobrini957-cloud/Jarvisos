import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const checks: Record<string, boolean | string> = {}

  // Check env vars (true = set, false = missing/placeholder)
  checks['NEXT_PUBLIC_SUPABASE_URL']      = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  checks['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  checks['SUPABASE_SERVICE_ROLE_KEY']     = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_service_role_key')
  checks['GROQ_API_KEY']                  = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'))
  checks['METAAPI_TOKEN']                 = !!process.env.METAAPI_TOKEN
  checks['MT5_ACCOUNT_ID']               = !!process.env.MT5_ACCOUNT_ID

  // Test Supabase connection
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('account_snapshots').select('id').limit(1)
    checks['supabase_connection'] = error ? `ERROR: ${error.message}` : 'OK'
  } catch (e) {
    checks['supabase_connection'] = `EXCEPTION: ${String(e)}`
  }

  return NextResponse.json(checks)
}
