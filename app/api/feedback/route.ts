import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/api/auth'
import { rateLimit } from '@/lib/api/rate-limit'

const KINDS = ['bug', 'idea', 'confusing', 'praise'] as const
const MAX_MESSAGE = 4000

/**
 * File a piece of beta feedback.
 *
 * The context fields are captured by the client rather than asked for — a
 * tester will not think to tell us which tab they were on or what width their
 * screen was, and those two answer most "works for me" reports on their own.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generous, but enough that a stuck retry loop cannot fill the table.
  if (!rateLimit(`feedback:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many reports at once — give it a minute.' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const message = String(body?.message ?? '').trim()
  if (!message) return NextResponse.json({ error: 'Say what happened first.' }, { status: 400 })

  const kind = KINDS.includes(body?.kind) ? body.kind : 'bug'

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { error } = await db.from('feedback').insert({
    user_id:     user.id,
    kind,
    message:     message.slice(0, MAX_MESSAGE),
    tab:         body?.tab ? String(body.tab).slice(0, 60) : null,
    path:        body?.path ? String(body.path).slice(0, 200) : null,
    viewport:    body?.viewport ? String(body.viewport).slice(0, 20) : null,
    user_agent:  req.headers.get('user-agent')?.slice(0, 400) ?? null,
    app_version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
  })

  if (error) {
    console.error('[feedback] insert failed', error)
    return NextResponse.json({ error: 'Could not save that — try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
