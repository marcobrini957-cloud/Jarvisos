import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAlert, alertingConfigured } from '@/lib/alerts'

// Bridge liveness backstop — a DAILY Vercel cron (see vercel.json).
//
// Fast detection does not live here. It lives on the bridge box itself
// (`bridge/watchdog.sh` under a systemd timer, every minute), because the
// failures that actually happen are local — pm2 crashed, disk full, nginx down,
// a terminal container died — and this cron would find them up to 23 hours
// late. Hobby-plan crons cannot run more often than daily.
//
// What this covers is the one thing the box cannot report: the box being gone.
// If Hetzner loses the machine, watchdog.sh goes with it and stays silent, and
// only an outside observer notices bridge_last_seen going stale.
//
// Edge-triggered — one message going down, one coming back. Channels live in
// lib/alerts.ts (Telegram and/or a Discord/Slack webhook); inert if neither is
// configured, so there is never a false sense of monitoring.

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
    await sendAlert(
      `🔴 VELQUOR bridge OFFLINE\n\n` +
      `No heartbeat for ${mins != null ? `${mins} min` : 'a while'}.\n` +
      `The box-side watchdog has not reported either, so the machine itself may be gone.\n` +
      `Live trade sync is down for all users.`,
    )
    await sb.from('bridge_settings').update({ bridge_offline_alerted: true }).eq('id', 1)
    return NextResponse.json({ ok: true, status: 'offline', alerted: true })
  }

  if (!stale && alreadyAlerted) {
    await sendAlert('🟢 VELQUOR bridge RECOVERED\n\nHeartbeat is back. Live trade sync restored.')
    await sb.from('bridge_settings').update({ bridge_offline_alerted: false }).eq('id', 1)
    return NextResponse.json({ ok: true, status: 'recovered', alerted: true })
  }

  // Surfaced so /dev can say "monitoring is on" rather than leaving it a guess.
  return NextResponse.json({
    ok: true,
    status: stale ? 'offline' : 'online',
    alertingConfigured: alertingConfigured(),
  })
}
