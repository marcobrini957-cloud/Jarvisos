import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/api/auth'

function db() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * Record what happened to the first-run tour.
 *
 *   shown     — it appeared; increments the counter that limits it to the first
 *               couple of logins
 *   completed — reached the end, or dismissed. Either way it stops: someone who
 *               closes it twice has told us something
 *   replay    — Settings asked for it again, so clear the state entirely
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json().catch(() => ({ action: null }))
  const sb = db()

  if (action === 'shown') {
    const { data } = await sb
      .from('user_profiles').select('tour_shown_count').eq('id', user.id).maybeSingle()
    await sb.from('user_profiles')
      .update({ tour_shown_count: (data?.tour_shown_count ?? 0) + 1 })
      .eq('id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'completed') {
    await sb.from('user_profiles')
      .update({ tour_completed_at: new Date().toISOString() })
      .eq('id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'replay') {
    await sb.from('user_profiles')
      .update({ tour_completed_at: null, tour_shown_count: 0 })
      .eq('id', user.id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
