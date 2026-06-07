import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function GET() {
  const checks: Record<string, boolean | string> = {}

  // Check env vars (true = set, false = missing/placeholder)
  checks['NEXT_PUBLIC_SUPABASE_URL']      = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  checks['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  checks['SUPABASE_SERVICE_ROLE_KEY']     = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_service_role_key')
  checks['GROQ_API_KEY']                  = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'))
  checks['METAAPI_TOKEN']                 = !!process.env.METAAPI_TOKEN
  checks['MT5_ACCOUNT_ID']               = !!process.env.MT5_ACCOUNT_ID

  // Test Supabase connection + data counts
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('account_snapshots').select('id').limit(1)
    checks['supabase_connection'] = error ? `ERROR: ${error.message}` : 'OK'

    const { count: tradeCount } = await supabase.from('trades').select('*', { count: 'exact', head: true })
    checks['trades_in_db'] = tradeCount ?? 0

    const { count: snapshotCount } = await supabase.from('account_snapshots').select('*', { count: 'exact', head: true })
    checks['snapshots_in_db'] = snapshotCount ?? 0
  } catch (e) {
    checks['supabase_connection'] = `EXCEPTION: ${String(e)}`
  }

  // Test MetaAPI connection
  try {
    const token     = process.env.METAAPI_TOKEN
    const accountId = process.env.MT5_ACCOUNT_ID
    const res = await fetch(
      `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${accountId}/account-information`,
      { headers: { 'auth-token': token! }, cache: 'no-store' }
    )
    const text = await res.text()
    if (res.ok) {
      const data = JSON.parse(text)
      checks['metaapi_connection'] = `OK — balance: ${data.balance} ${data.currency}`
    } else {
      checks['metaapi_connection'] = `ERROR ${res.status}: ${text.slice(0, 200)}`
    }
  } catch (e) {
    checks['metaapi_connection'] = `EXCEPTION: ${String(e)}`
  }

  return NextResponse.json(checks)
}
