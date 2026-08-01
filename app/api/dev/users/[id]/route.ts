import { NextRequest, NextResponse } from 'next/server'
import { isDevAuthed, devUnauthorized, serviceClient, audit, isMissingSchemaError } from '@/lib/api/dev-auth'
import { isOwner, OWNER_BAN_REFUSED } from '@/lib/api/owner'

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
    sb.from('account_snapshots').select('balance, equity, snapshot_at').eq('user_id', id).order('snapshot_at', { ascending: false }).limit(1),
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
      // The owner cannot be banned — it would take down its own dashboard and
      // MT5 sync. See lib/api/owner.ts; the database enforces this too.
      if (await isOwner(id)) {
        return NextResponse.json({ error: OWNER_BAN_REFUSED }, { status: 409 })
      }
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

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Every table that stores rows against a user. There are **no foreign keys from
 * public.* to auth.users**, so nothing cascades: removing the auth record alone
 * would leave this user's trades, journal and holdings orphaned in the database
 * forever. Each table is purged explicitly, and this list must be extended
 * whenever a new user-scoped table is added.
 */
const USER_TABLES = [
  'account_snapshots', 'ai_usage', 'calendar_events', 'copy_accounts', 'copy_groups',
  'feedback', 'habit_completions', 'habits', 'journal_entries', 'macro_briefings',
  'mt5_candles', 'partner_clicks', 'portfolio_holdings', 'portfolio_snapshots',
  'tasks', 'telegram_messages', 'trades', 'weekly_reviews',
] as const

/**
 * DELETE /api/dev/users/:id — remove a user and everything they own.
 *
 * Irreversible, so it demands the account's own email back in the body as
 * confirmation: an admin who mistypes an id cannot delete a stranger by
 * accident. The audit row is written *before* the purge, because afterwards
 * there is nothing left to describe.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDevAuthed(req)) return devUnauthorized()
  const { id } = await params
  const sb = serviceClient()

  let confirmEmail = ''
  try {
    const body = await req.json()
    confirmEmail = String(body?.confirmEmail ?? '').trim().toLowerCase()
  } catch { /* handled below */ }

  const { data: target } = await sb
    .from('user_profiles')
    .select('id, email')
    .eq('id', id)
    .maybeSingle()

  const { data: authUser } = await sb.auth.admin.getUserById(id)
  const email = (target?.email ?? authUser?.user?.email ?? '').toLowerCase()

  if (!email) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!confirmEmail || confirmEmail !== email) {
    return NextResponse.json({ error: 'confirm_email_mismatch' }, { status: 400 })
  }

  await audit(sb, 'delete_user', { userId: id, email }, { tables: USER_TABLES.length })

  // Best-effort: hand the cloud terminal back before the account goes, or the
  // container keeps running against credentials nobody owns any more.
  const bridgeUrl = process.env.BRIDGE_URL
  const adminToken = process.env.BRIDGE_ADMIN_TOKEN
  let terminalReleased: boolean | null = null
  if (bridgeUrl && adminToken) {
    try {
      const res = await fetch(`${bridgeUrl}/provision/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(8000),
      })
      terminalReleased = res.ok
    } catch {
      terminalReleased = false
    }
  }

  const failed: string[] = []
  for (const table of USER_TABLES) {
    const { error } = await sb.from(table).delete().eq('user_id', id)
    // A table that does not exist in this environment is not a failure.
    if (error && !isMissingSchemaError(error.message)) failed.push(`${table}: ${error.message}`)
  }

  // A beta invite is a record of who was let in, so it outlives the account —
  // but it must not keep pointing at a user id that no longer resolves. Unlink
  // it and revoke it: the code stops working, and the row still shows in the
  // Beta tab that this person came and went. Marco can restore it to re-issue.
  const { error: inviteErr } = await sb
    .from('beta_invites')
    .update({ redeemed_by: null, revoked_at: new Date().toISOString() })
    .eq('redeemed_by', id)
  if (inviteErr && !isMissingSchemaError(inviteErr.message)) failed.push(`beta_invites: ${inviteErr.message}`)

  const { error: profileErr } = await sb.from('user_profiles').delete().eq('id', id)
  if (profileErr && !isMissingSchemaError(profileErr.message)) failed.push(`user_profiles: ${profileErr.message}`)

  // The auth record goes last: while it exists the user can still sign in, so
  // failing here must not leave a logged-in account with no data behind it.
  const { error: authErr } = await sb.auth.admin.deleteUser(id)
  if (authErr) {
    return NextResponse.json(
      { error: `Data purged but the login could not be removed: ${authErr.message}`, failed },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, email, terminalReleased, failed })
}
