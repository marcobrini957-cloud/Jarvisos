import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { normalizeBetaCode } from '@/lib/api/site-lock'
import { isOwner } from '@/lib/api/owner'

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

/**
 * Revoke or restore an invite.
 *
 * Revoking also bans the account that redeemed it. That is the part with teeth:
 * the gate cookie already in the holder's browser stays cryptographically valid
 * for its 30 days, but a banned account loses every API route (lib/api/auth.ts
 * checks it on each call), so what they keep is the marketing site.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await ctx.params
  const normalized = normalizeBetaCode(decodeURIComponent(code))
  const { revoked, note, grant_tier, grant_days } = await req.json()

  const db = admin()
  const update: Record<string, unknown> = {}
  if (revoked !== undefined)     update.revoked_at = revoked ? new Date().toISOString() : null
  if (note !== undefined)        update.note = note
  if (grant_tier !== undefined)  update.grant_tier = grant_tier
  if (grant_days !== undefined)  update.grant_days = grant_days

  const { data, error } = await db
    .from('beta_invites')
    .update(update)
    .eq('code', normalized)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (revoked !== undefined && data?.redeemed_by) {
    // Revoking bans the redeemer — except when the redeemer is the owner. On
    // 2026-08-01 it was: a test invite had been redeemed with the owner account,
    // and revoking it killed sync for 19 hours. The code is still revoked; only
    // the ban is skipped.
    const ownerRedeemed = await isOwner(data.redeemed_by)

    if (!ownerRedeemed) {
      // Write the reason and timestamp too. Without them the row said `banned`
      // and nothing else, so there was no way to tell what had done it.
      await db.from('user_profiles').update(
        revoked
          ? {
              banned: true,
              banned_at: new Date().toISOString(),
              banned_reason: `beta invite ${normalized} revoked`,
            }
          : { banned: false, banned_at: null, banned_reason: null },
      ).eq('id', data.redeemed_by)
    }

    await db.from('admin_audit_log').insert({
      action: revoked ? 'beta_invite_revoked' : 'beta_invite_restored',
      target_user_id: data.redeemed_by,
      detail: `code ${normalized}${ownerRedeemed ? ' (owner — ban skipped)' : ''}`,
    }).select().maybeSingle()

    if (ownerRedeemed) {
      return NextResponse.json({ ...data, ownerBanSkipped: true })
    }
  }

  return NextResponse.json(data)
}

/** Delete an invite outright. Only allowed while nobody has redeemed it. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await ctx.params
  const normalized = normalizeBetaCode(decodeURIComponent(code))

  const db = admin()
  const { data: invite } = await db
    .from('beta_invites')
    .select('redeemed_by')
    .eq('code', normalized)
    .maybeSingle()
  if (invite?.redeemed_by) {
    return NextResponse.json(
      { error: 'That code has been redeemed — revoke it instead, so the link to the account survives.' },
      { status: 409 },
    )
  }

  const { error } = await db.from('beta_invites').delete().eq('code', normalized)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
