import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 15

// User-facing connectivity check for the Settings panel. Deliberately minimal:
// no global row counts and no infra env-presence disclosure (those are business
// metrics / infra details that don't belong in a per-user response — the admin
// /dev area has the full diagnostics). Only what the Settings status rows render.
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const checks: Record<string, boolean | string> = {}
  checks['GROQ_API_KEY'] = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'))

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('account_snapshots').select('id').limit(1)
    checks['supabase_connection'] = error ? 'ERROR' : 'OK'
  } catch {
    checks['supabase_connection'] = 'ERROR'
  }

  return NextResponse.json(checks)
}
