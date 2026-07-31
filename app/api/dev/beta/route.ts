import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateCode } from '@/lib/beta/invites'

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

/** Every invite, newest first, with the profile of whoever redeemed it. */
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = admin()
  const { data: invites, error } = await db
    .from('beta_invites')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (invites ?? []).map(i => i.redeemed_by).filter(Boolean) as string[]
  let profiles: Record<string, { tier: string; last_seen_at: string | null; banned: boolean }> = {}
  if (ids.length) {
    const { data: rows } = await db
      .from('user_profiles')
      .select('id, subscription_tier, last_seen_at, banned')
      .in('id', ids)
    profiles = Object.fromEntries((rows ?? []).map(r => [r.id, {
      tier: r.subscription_tier ?? 'free',
      last_seen_at: r.last_seen_at ?? null,
      banned: r.banned === true,
    }]))
  }

  // Count trades per redeemed account — the only number that says whether a
  // tester actually connected anything or just looked around.
  const tradeCounts: Record<string, number> = {}
  for (const id of ids) {
    const { count } = await db
      .from('trades')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id)
    tradeCounts[id] = count ?? 0
  }

  return NextResponse.json((invites ?? []).map(i => ({
    ...i,
    account: i.redeemed_by
      ? { ...profiles[i.redeemed_by], trades: tradeCounts[i.redeemed_by] ?? 0 }
      : null,
  })))
}

/** Create a code for a person. Marco types a name; the suffix is generated. */
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, note = null, grant_tier = 'pro', grant_days = 90 } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const db = admin()
  // Retry on the astronomically unlikely suffix collision rather than handing
  // back a 500 that reads like the feature is broken.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode(name)
    const { data, error } = await db
      .from('beta_invites')
      .insert({ code, name: name.trim(), note, grant_tier, grant_days })
      .select()
      .single()
    if (!error) return NextResponse.json(data)
    if (error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Could not allocate a code' }, { status: 500 })
}
