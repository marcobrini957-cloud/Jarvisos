import { NextRequest, NextResponse } from 'next/server'
import { isDevAuthed, devUnauthorized, serviceClient, isMissingSchemaError } from '@/lib/api/dev-auth'

// GET /api/dev/users?q=<search>&filter=all|banned|pro|ultra|online
export async function GET(req: NextRequest) {
  if (!isDevAuthed(req)) return devUnauthorized()
  const sb = serviceClient()

  // Lazy expiry: gifted tiers that ran out fall back to free.
  await sb
    .from('user_profiles')
    .update({ subscription_tier: 'free', tier_expires_at: null })
    .lt('tier_expires_at', new Date().toISOString())

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const filter = req.nextUrl.searchParams.get('filter') ?? 'all'

  let query = sb
    .from('user_profiles')
    .select('id, email, display_name, subscription_tier, tier_expires_at, mt5_login, ea_connected, ea_last_seen, ea_version, ea_broker, banned, banned_reason, banned_at, admin_note, last_seen_at, created_at, velquor_api_key')
    .order('created_at', { ascending: false })
    .limit(200)

  if (q) query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%,mt5_login.ilike.%${q}%`)
  if (filter === 'banned') query = query.eq('banned', true)
  if (filter === 'pro') query = query.eq('subscription_tier', 'pro')
  if (filter === 'ultra') query = query.eq('subscription_tier', 'ultra')
  if (filter === 'online') query = query.gt('last_seen_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())

  const { data, error } = await query
  if (error) {
    if (isMissingSchemaError(error.message)) {
      return NextResponse.json({ users: [], schemaPending: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Never ship full API keys to the browser — prefix is enough to identify.
  const users = (data ?? []).map(u => ({
    ...u,
    velquor_api_key: u.velquor_api_key ? `${String(u.velquor_api_key).slice(0, 11)}…` : null,
  }))

  return NextResponse.json({ users, schemaPending: false })
}
