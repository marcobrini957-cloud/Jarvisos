import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function GET() {
  const checks: Record<string, boolean | string> = {}

  checks['NEXT_PUBLIC_SUPABASE_URL']      = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  checks['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  checks['SUPABASE_SERVICE_ROLE_KEY']     = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_service_role_key')
  checks['GROQ_API_KEY']                  = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'))

  // Supabase connectivity + row counts
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('account_snapshots').select('id').limit(1)
    checks['supabase_connection'] = error ? `ERROR: ${error.message}` : 'OK'

    const { count: tradeCount } = await supabase.from('trades').select('*', { count: 'exact', head: true })
    checks['trades_in_db'] = `${tradeCount ?? 0}`

    const { count: snapshotCount } = await supabase.from('account_snapshots').select('*', { count: 'exact', head: true })
    checks['snapshots_in_db'] = `${snapshotCount ?? 0}`

    // Check if bridge SQL migration has been applied
    const { error: colErr } = await supabase.from('user_profiles').select('velquor_api_key').limit(1)
    checks['bridge_migration'] = colErr ? 'Pending — run supabase-bridge-setup.sql' : 'OK'
  } catch (e) {
    checks['supabase_connection'] = `EXCEPTION: ${String(e)}`
  }

  return NextResponse.json(checks)
}
