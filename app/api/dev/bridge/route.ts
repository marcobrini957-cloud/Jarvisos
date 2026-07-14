import { NextRequest, NextResponse } from 'next/server'
import { isDevAuthed, devUnauthorized, serviceClient, audit, isMissingSchemaError } from '@/lib/api/dev-auth'

// How stale the bridge heartbeat may be before we call it offline.
// The bridge writes every 30 s, so 90 s = two missed beats.
const HEARTBEAT_STALE_MS = 90_000

// GET /api/dev/bridge — settings + heartbeat-derived status (+ live stats when reachable)
export async function GET(req: NextRequest) {
  if (!isDevAuthed(req)) return devUnauthorized()
  const sb = serviceClient()

  const { data: row, error } = await sb.from('bridge_settings').select('*').eq('id', 1).maybeSingle()
  if (error || !row) {
    if (!error || isMissingSchemaError(error.message)) {
      return NextResponse.json({ schemaPending: true, status: 'not_configured' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const lastSeen = row.bridge_last_seen ? new Date(row.bridge_last_seen).getTime() : 0
  const status = row.maintenance_mode
    ? 'maintenance'
    : Date.now() - lastSeen < HEARTBEAT_STALE_MS
      ? 'online'
      : row.bridge_last_seen
        ? 'offline'
        : 'never_seen'

  // Live stats straight from the bridge when we can reach it (optional).
  let live: unknown = null
  const bridgeUrl = process.env.BRIDGE_URL
  const adminToken = process.env.BRIDGE_ADMIN_TOKEN
  if (bridgeUrl && adminToken) {
    try {
      const r = await fetch(`${bridgeUrl.replace(/\/$/, '')}/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      })
      if (r.ok) live = await r.json()
    } catch {}
  }

  return NextResponse.json({ schemaPending: false, status, settings: row, live })
}

const EDITABLE = ['maintenance_mode', 'sync_enabled', 'copy_enabled', 'rate_limit_sync', 'rate_limit_copy', 'min_ea_version', 'broadcast_message'] as const

// PATCH /api/dev/bridge — update admin-editable settings (bridge picks them up ≤30 s)
export async function PATCH(req: NextRequest) {
  if (!isDevAuthed(req)) return devUnauthorized()
  const sb = serviceClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  for (const key of EDITABLE) {
    if (!(key in body)) continue
    const v = body[key]
    if (key === 'maintenance_mode' || key === 'sync_enabled' || key === 'copy_enabled') {
      if (typeof v !== 'boolean') return NextResponse.json({ error: `${key} must be boolean` }, { status: 400 })
    } else if (key === 'rate_limit_sync' || key === 'rate_limit_copy') {
      if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > 100000) {
        return NextResponse.json({ error: `${key} must be an integer 1–100000` }, { status: 400 })
      }
    } else if (key === 'min_ea_version') {
      if (typeof v !== 'string' || !/^\d+(\.\d+)*$/.test(v)) {
        return NextResponse.json({ error: 'min_ea_version must look like "2.00"' }, { status: 400 })
      }
    } else if (key === 'broadcast_message') {
      if (v !== null && typeof v !== 'string') return NextResponse.json({ error: 'broadcast_message must be string or null' }, { status: 400 })
    }
    update[key] = key === 'broadcast_message' && v === '' ? null : v
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_editable_fields' }, { status: 400 })
  }

  update.updated_at = new Date().toISOString()
  update.updated_by = 'dev-console'

  const { error } = await sb.from('bridge_settings').update(update).eq('id', 1)
  if (error) {
    const status = isMissingSchemaError(error.message) ? 409 : 500
    return NextResponse.json({ error: error.message, schemaPending: status === 409 }, { status })
  }

  await audit(sb, 'update_bridge_settings', undefined, update)

  // Ask the bridge to apply immediately instead of waiting for the next poll.
  const bridgeUrl = process.env.BRIDGE_URL
  const adminToken = process.env.BRIDGE_ADMIN_TOKEN
  if (bridgeUrl && adminToken) {
    try {
      await fetch(`${bridgeUrl.replace(/\/$/, '')}/admin/reload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(3000),
      })
    } catch {}
  }

  return NextResponse.json({ ok: true })
}
