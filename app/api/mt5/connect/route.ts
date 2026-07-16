import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { getAuthUserId } from '@/lib/api/auth'
import { rateLimit } from '@/lib/api/rate-limit'
import { getUserPlan } from '@/lib/api/tier'
import { resolveServerAddress } from '@/lib/brokers'

// Instant Connect: provisions a VELQUOR cloud terminal (MT5 under Wine on our
// bridge server) for the user's account. Credentials go straight to the
// provisioner over TLS and are stored encrypted on the bridge box only —
// they are never written to Supabase.

const BRIDGE_URL = process.env.BRIDGE_URL
const ADMIN_TOKEN = process.env.BRIDGE_ADMIN_TOKEN

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function provisioner(path: string, init?: RequestInit) {
  return fetch(`${BRIDGE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(65_000),
  })
}

async function getApiKey(userId: string): Promise<string | null> {
  const sb = service()
  const { data } = await sb
    .from('user_profiles')
    .select('velquor_api_key')
    .eq('id', userId)
    .maybeSingle()
  if (data?.velquor_api_key) return data.velquor_api_key
  // Older profiles may predate the api-key column default — mint one now.
  const key = `vq_${randomBytes(16).toString('hex')}`
  const { error } = await sb
    .from('user_profiles')
    .update({ velquor_api_key: key })
    .eq('id', userId)
  return error ? null : key
}

export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!BRIDGE_URL || !ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Bridge not configured' }, { status: 503 })
  }
  if (!rateLimit(`mt5-connect:${userId}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — wait a minute.' }, { status: 429 })
  }

  // Tier gate: cloud terminals (Instant Connect) are a paid feature. Free users
  // run the EA in their own MetaTrader instead.
  const plan = await getUserPlan(userId)
  if (plan.cloudTerminals < 1) {
    return NextResponse.json(
      { error: 'Cloud hosting is a Pro feature. On the free plan, connect by running the VELQUOR EA in your own MetaTrader.', code: 'tier_required' },
      { status: 403 },
    )
  }

  const body = await req.json().catch(() => null)
  const login = String(body?.login ?? '').trim()
  const password = String(body?.password ?? '').trim()
  const serverInput = String(body?.server ?? '').trim()
  if (!/^\d{3,12}$/.test(login)) {
    return NextResponse.json({ error: 'MT5 login must be your numeric account number.' }, { status: 400 })
  }
  if (!password || password.length > 64) {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 })
  }
  // Resolve friendly server name / broker pick / host:port → connectable address.
  const server = resolveServerAddress(serverInput)
  if (!server) {
    return NextResponse.json(
      { error: 'Pick your broker and server, or enter the server address (e.g. live2.mt5.ts.blueberrymarkets.com:443).' },
      { status: 400 },
    )
  }

  const apiKey = await getApiKey(userId)
  if (!apiKey) return NextResponse.json({ error: 'Could not prepare account.' }, { status: 500 })

  const res = await provisioner('/provision', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, login, password, server, api_key: apiKey }),
  }).catch(() => null)

  if (!res) return NextResponse.json({ error: 'Bridge unreachable — try again shortly.' }, { status: 502 })
  if (res.status === 507) {
    return NextResponse.json(
      { error: 'All cloud terminal slots are currently taken. Contact support to get a slot.' },
      { status: 503 }
    )
  }
  if (!res.ok) return NextResponse.json({ error: 'Connection failed on our side.' }, { status: 502 })

  await service().from('user_profiles').update({ mt5_login: Number(login) }).eq('id', userId)
  return NextResponse.json({ status: 'starting' })
}

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!BRIDGE_URL || !ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Bridge not configured' }, { status: 503 })
  }

  const [termRes, profile] = await Promise.all([
    provisioner(`/provision/${userId}/status`).catch(() => null),
    service()
      .from('user_profiles')
      .select('ea_connected, ea_last_seen, mt5_login')
      .eq('id', userId)
      .maybeSingle(),
  ])
  const terminal = termRes?.ok ? await termRes.json() : { exists: false, running: false }
  return NextResponse.json({
    terminal,
    ea_connected: profile.data?.ea_connected ?? false,
    ea_last_seen: profile.data?.ea_last_seen ?? null,
    mt5_login: profile.data?.mt5_login ?? null,
  })
}

export async function DELETE() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!BRIDGE_URL || !ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Bridge not configured' }, { status: 503 })
  }
  const res = await provisioner(`/provision/${userId}`, { method: 'DELETE' }).catch(() => null)
  if (!res?.ok) return NextResponse.json({ error: 'Disconnect failed — try again.' }, { status: 502 })
  await service()
    .from('user_profiles')
    .update({ ea_connected: false })
    .eq('id', userId)
  return NextResponse.json({ status: 'disconnected' })
}
