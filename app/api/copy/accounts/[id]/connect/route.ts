import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { getAuthUserId } from '@/lib/api/auth'
import { rateLimit } from '@/lib/api/rate-limit'
import { getUserPlan } from '@/lib/api/tier'
import { resolveServerAddress } from '@/lib/brokers'
import { accountSlot, provisioner, userSlots, bridgeConfigured } from '@/lib/api/copy-cloud'

// Cloud-host a copy-trading account: provisions a dedicated VELQUOR terminal
// (slot per account) running the EA in COPY_LEADER / COPY_FOLLOWER mode with the
// group's lot settings. If the account is the user's already-connected main
// terminal, that terminal is re-provisioned in copy mode using its stored
// credentials — no password needed and no extra slot burned.
//
// Credentials go straight to the provisioner over TLS and are stored encrypted
// on the bridge box only — never in Supabase.

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getApiKey(userId: string): Promise<string | null> {
  const sb = service()
  const { data } = await sb
    .from('user_profiles')
    .select('velquor_api_key')
    .eq('id', userId)
    .maybeSingle()
  if (data?.velquor_api_key) return data.velquor_api_key
  const key = `vq_${randomBytes(16).toString('hex')}`
  const { error } = await sb
    .from('user_profiles')
    .update({ velquor_api_key: key })
    .eq('id', userId)
  return error ? null : key
}

type Ctx = { params: Promise<{ id: string }> }

async function loadAccount(userId: string, accountId: string) {
  const { data } = await service()
    .from('copy_accounts')
    .select('id, role, mt5_login, mt5_server, group_id, copy_groups(id, lot_mode, lot_fixed, lot_multiplier, max_lot)')
    .eq('id', accountId)
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!bridgeConfigured()) {
    return NextResponse.json({ error: 'Bridge not configured' }, { status: 503 })
  }
  if (!rateLimit(`copy-connect:${userId}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — wait a minute.' }, { status: 429 })
  }

  const plan = await getUserPlan(userId)
  if (plan.cloudTerminals < 1) {
    return NextResponse.json(
      { error: 'Cloud hosting is a Pro feature. On the free plan, run the VELQUOR EA in your own MetaTrader with the copy settings shown on the group card.', code: 'tier_required' },
      { status: 403 },
    )
  }

  const { id: accountId } = await params
  const account = await loadAccount(userId, accountId)
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const group = Array.isArray(account.copy_groups) ? account.copy_groups[0] : account.copy_groups
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const copy = {
    mode: account.role as 'leader' | 'follower',
    group_id: account.group_id,
    lot_mode: group.lot_mode === 'fixed' ? 'fixed' : 'proportional',
    lot_fixed: group.lot_fixed ?? 0.01,
    lot_mult: group.lot_multiplier ?? 1.0,
    max_lot: group.max_lot ?? 10.0,
  }

  const apiKey = await getApiKey(userId)
  if (!apiKey) return NextResponse.json({ error: 'Could not prepare account.' }, { status: 500 })

  // Same login as the user's connected main terminal? Re-provision that
  // terminal in copy mode with its stored credentials — no password needed.
  const { data: profile } = await service()
    .from('user_profiles')
    .select('mt5_login')
    .eq('id', userId)
    .maybeSingle()
  const isMainAccount = profile?.mt5_login != null && String(profile.mt5_login) === String(account.mt5_login)

  let res: Response | null
  if (isMainAccount) {
    res = await provisioner('/provision', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, api_key: apiKey, reuse_stored: true, copy }),
    }).catch(() => null)
    if (res?.status === 404) {
      return NextResponse.json(
        { error: 'Your main terminal has no stored credentials — enter the password to connect this account.', code: 'password_required' },
        { status: 409 },
      )
    }
  } else {
    const body = await req.json().catch(() => null)
    const password = String(body?.password ?? '').trim()
    const serverInput = String(body?.server ?? account.mt5_server ?? '').trim()
    if (!password || password.length > 64) {
      return NextResponse.json(
        { error: account.role === 'follower'
            ? 'The trading password is required — followers place real trades.'
            : 'Password required (the read-only investor password is enough for a leader).' },
        { status: 400 },
      )
    }
    const server = resolveServerAddress(serverInput)
    if (!server) {
      return NextResponse.json(
        { error: 'Pick your broker server or enter the server address (e.g. live2.mt5.ts.blueberrymarkets.com:443).' },
        { status: 400 },
      )
    }
    if (!/^\d{3,12}$/.test(String(account.mt5_login))) {
      return NextResponse.json({ error: 'This account has no valid MT5 login number.' }, { status: 400 })
    }

    // Tier limit: total cloud terminals (main + copy slots)
    const slots = await userSlots(userId)
    const slot = accountSlot(accountId)
    if (!slots.slots.includes(slot) && slots.count >= plan.cloudTerminals) {
      return NextResponse.json(
        { error: `Your plan includes ${plan.cloudTerminals} cloud terminal${plan.cloudTerminals > 1 ? 's' : ''} and all are in use. Disconnect one or upgrade.`, code: 'tier_limit' },
        { status: 403 },
      )
    }

    res = await provisioner('/provision', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId, slot,
        login: String(account.mt5_login), password, server,
        api_key: apiKey, copy,
      }),
    }).catch(() => null)
  }

  if (!res) return NextResponse.json({ error: 'Bridge unreachable — try again shortly.' }, { status: 502 })
  if (res.status === 507) {
    return NextResponse.json(
      { error: 'All cloud terminal slots are currently taken. Contact support to get a slot.' },
      { status: 503 },
    )
  }
  if (!res.ok) return NextResponse.json({ error: 'Connection failed on our side.' }, { status: 502 })

  // status flips to 'active' when the EA's first heartbeat reaches the bridge
  await service()
    .from('copy_accounts')
    .update({ status: 'pending' })
    .eq('id', accountId)
    .eq('user_id', userId)

  return NextResponse.json({ status: 'starting', hosted: isMainAccount ? 'main' : 'slot' })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!bridgeConfigured()) {
    return NextResponse.json({ error: 'Bridge not configured' }, { status: 503 })
  }

  const { id: accountId } = await params
  const account = await loadAccount(userId, accountId)
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const res = await provisioner(`/provision/${userId}?slot=${accountSlot(accountId)}`, { method: 'DELETE' }).catch(() => null)
  if (!res?.ok) return NextResponse.json({ error: 'Disconnect failed — try again.' }, { status: 502 })

  await service()
    .from('copy_accounts')
    .update({ status: 'pending' })
    .eq('id', accountId)
    .eq('user_id', userId)

  return NextResponse.json({ status: 'disconnected' })
}
