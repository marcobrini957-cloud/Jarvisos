import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function isAuthed(req: NextRequest) {
  const secret = process.env.DEV_SECRET
  if (!secret) return false
  const cookie = req.cookies.get('__dev_session')
  return !!cookie?.value && cookie.value === secret
}

function admin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/** Every report, newest first, with the email of whoever filed it. */
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const { data: rows, error } = await db
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = [...new Set((rows ?? []).map(r => r.user_id))]
  let emails: Record<string, string> = {}
  if (ids.length) {
    const { data: profiles } = await db
      .from('user_profiles')
      .select('id, email')
      .in('id', ids)
    emails = Object.fromEntries((profiles ?? []).map(p => [p.id, p.email ?? '—']))
  }

  return NextResponse.json((rows ?? []).map(r => ({ ...r, email: emails[r.user_id] ?? '—' })))
}

/** Triage: move a report along, or leave a note on it. */
export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, admin_note } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (status !== undefined)     update.status = status
  if (admin_note !== undefined) update.admin_note = admin_note

  const { data, error } = await admin()
    .from('feedback')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
