import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Bridge liveness watchdog — runs on a Vercel Cron (see vercel.json).
// The bridge writes bridge_settings.bridge_last_seen every ~30s. If that goes
// stale, live trading data has stopped and nobody would know. This posts an
// EDGE-TRIGGERED alert (one message when it goes down, one when it recovers) to
// ALERT_WEBHOOK_URL — payload works for both Discord ({content}) and Slack ({text}).
//
// Fully inert until configured: if ALERT_WEBHOOK_URL is unset it just no-ops, so
// there is no false sense of monitoring. Add the env var to switch it on.

export const dynamic = 'force-dynamic'

// Allow a couple of missed 30s heartbeats + cron slack before crying wolf.
const STALE_MS = 5 * 60 * 1000

function authorized(req: NextRequest): boolean {
  // Vercel sets this header on cron invocations. Also accept a shared secret.
  if (req.headers.get('x-vercel-cron')) return true
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true
  // If no secret is configured, don't gate (route only reads + maybe alerts).
  return !secret
}

async function notify(message: string) {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message, text: message }),
    })
  } catch {}
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: row, error } = await sb
    .from('bridge_settings')
    .select('bridge_last_seen, bridge_offline_alerted, maintenance_mode')
    .eq('id', 1)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ ok: false, reason: 'no bridge_settings row' })
  }

  // Don't page during a planned maintenance window.
  if (row.maintenance_mode) {
    return NextResponse.json({ ok: true, status: 'maintenance' })
  }

  const lastSeen = row.bridge_last_seen ? new Date(row.bridge_last_seen).getTime() : 0
  const stale = Date.now() - lastSeen > STALE_MS
  const alreadyAlerted = row.bridge_offline_alerted === true

  if (stale && !alreadyAlerted) {
    const mins = lastSeen ? Math.round((Date.now() - lastSeen) / 60000) : null
    await notify(`🔴 VELQUOR bridge OFFLINE — no heartbeat for ${mins != null ? `${mins} min` : 'a while'}. Live trade sync is down.`)
    await sb.from('bridge_settings').update({ bridge_offline_alerted: true }).eq('id', 1)
    return NextResponse.json({ ok: true, status: 'offline', alerted: true })
  }

  if (!stale && alreadyAlerted) {
    await notify('🟢 VELQUOR bridge RECOVERED — heartbeat is back. Live trade sync restored.')
    await sb.from('bridge_settings').update({ bridge_offline_alerted: false }).eq('id', 1)
    return NextResponse.json({ ok: true, status: 'recovered', alerted: true })
  }

  return NextResponse.json({ ok: true, status: stale ? 'offline' : 'online' })
}
