import { NextRequest, NextResponse } from 'next/server'
import { isDevAuthed, devUnauthorized, serviceClient, audit, isMissingSchemaError } from '@/lib/api/dev-auth'

// GET /api/dev/users/:id — full detail for the admin user panel
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDevAuthed(req)) return devUnauthorized()
  const { id } = await params
  const sb = serviceClient()

  const [{ data: profile, error }, { count: trades }, { count: openTrades }, { count: journalEntries }, { count: copyGroups }, { data: lastSnapshot }] = await Promise.all([
    sb.from('user_profiles').select('*').eq('id', id).maybeSingle(),
    sb.from('trades').select('*', { count: 'exact', head: true }).eq('user_id', id),
    sb.from('trades').select('*', { count: 'exact', head: true }).eq('user_id', id).eq('status', 'open'),
    sb.from('journal_entries').select('*', { count: 'exact', head: true }).eq('user_id', id),
    sb.from('copy_groups').select('*', { count: 'exact', head: true }).eq('user_id', id),
    sb.from('account_snapshots').select('balance, equity, recorded_at').eq('user_id', id).order('recorded_at', { ascending: false }).limit(1),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({
    profile: {
      ...profile,
      velquor_api_key: profile.velquor_api_key ? `${String(profile.velquor_api_key).slice(0, 11)}…` : null,
    },
    stats: {
      trades: trades ?? 0,
      openTrades: openTrades ?? 0,
      journalEntries: journalEntries ?? 0,
      copyGroups: copyGroups ?? 0,
      lastSnapshot: lastSnapshot?.[0] ?? null,
    },
  })
}

type AdminAction =
  | { action: 'ban'; reason?: string }
  | { action: 'unban' }
  | { action: 'set_tier'; tier: 'free' | 'pro' | 'ultra'; expires_days?: number | null }
  | { action: 'reset_api_key' }
  | { action: 'set_note'; note: string }

// POST /api/dev/users/:id — ban / unban / reward tier / reset key / note
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDevAuthed(req)) return devUnauthorized()
  const { id } = await params
  const sb = serviceClient()

  let body: AdminAction
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { data: target } = await sb.from('user_profiles').select('id, email').eq('id', id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let update: Record<string, unknown> = {}
  let auditDetail: Record<string, unknown> = {}
  let newApiKey: string | null = null

  switch (body.action) {
    case 'ban':
      update = {
        banned: true,
        banned_reason: body.reason?.slice(0, 500) || null,
        banned_at: new Date().toISOString(),
        ea_connected: false,
      }
      auditDetail = { reason: body.reason || null }
      break
    case 'unban':
      update = { banned: false, banned_reason: null, banned_at: null }
      break
    case 'set_tier': {
      if (!['free', 'pro', 'ultra'].includes(body.tier)) {
        return NextResponse.json({ error: 'invalid_tier' }, { status: 400 })
      }
      const days = body.expires_days
      const expiresAt =
        body.tier !== 'free' && typeof days === 'number' && days > 0
          ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
          : null
      update = { subscription_tier: body.tier, tier_expires_at: expiresAt }
      auditDetail = { tier: body.tier, expires_days: days ?? null }
      break
    }
    case 'reset_api_key':
      newApiKey = `vq_${crypto.randomUUID().replaceAll('-', '')}`
      update = { velquor_api_key: newApiKey, ea_connected: false }
      break
    case 'set_note':
      update = { admin_note: String(body.note ?? '').slice(0, 2000) || null }
      auditDetail = { note_length: String(body.note ?? '').length }
      break
    default:
      return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }

  const { error } = await sb.from('user_profiles').update(update).eq('id', id)
  if (error) {
    const status = isMissingSchemaError(error.message) ? 409 : 500
    return NextResponse.json(
      { error: error.message, schemaPending: status === 409 },
      { status }
    )
  }

  await audit(sb, `${body.action}_user`, { userId: id, email: target.email }, auditDetail)

  // The new API key is shown ONCE in the admin UI so it can be handed to the
  // user — afterwards only the prefix is ever exposed.
  return NextResponse.json({ ok: true, ...(newApiKey ? { newApiKey } : {}) })
}
