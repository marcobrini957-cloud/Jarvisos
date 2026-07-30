import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * account_snapshots retention — runs daily on a Vercel Cron (see vercel.json).
 *
 * The EA posts a snapshot every ~10 seconds per connected terminal. Measured on
 * the live database 2026-07-30: 8,700 rows a day from one login, 122,538 rows
 * since May — per user, forever. Every read in the product is
 * `order(snapshot_at desc).limit(1)`; nothing reads the history at full
 * resolution, so keeping it costs storage and buys nothing.
 *
 * The work happens in one SQL function (supabase-snapshot-pruning.sql) rather
 * than by pulling rows over the wire: last 48h raw, then hourly to 90 days,
 * then gone. This route only invokes it and reports what it removed.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(req: NextRequest): boolean {
  // Vercel sets this header on cron invocations. A shared secret also works,
  // for running it by hand.
  if (req.headers.get('x-vercel-cron')) return true
  const secret = process.env.CRON_SECRET
  if (secret) return req.headers.get('authorization') === `Bearer ${secret}`
  // Unlike the read-only watchdog, this route deletes. With no secret set it
  // stays closed to everything except Vercel's own scheduler.
  return false
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const started = Date.now()
  const { data, error } = await sb.rpc('prune_account_snapshots', {
    raw_hours: 48,
    keep_days: 90,
  })

  if (error) {
    console.error('[prune-snapshots]', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // The function returns a single row: { thinned, expired }.
  const row = Array.isArray(data) ? data[0] : data
  const thinned = Number(row?.thinned ?? 0)
  const expired = Number(row?.expired ?? 0)

  console.log(`[prune-snapshots] thinned=${thinned} expired=${expired} in ${Date.now() - started}ms`)
  return NextResponse.json({ ok: true, thinned, expired, ms: Date.now() - started })
}
