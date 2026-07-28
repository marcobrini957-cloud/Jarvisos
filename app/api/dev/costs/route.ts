import { NextRequest, NextResponse } from 'next/server'
import { isDevAuthed, devUnauthorized, serviceClient } from '@/lib/api/dev-auth'
import {
  buildCostReport, DEFAULT_COST_SETTINGS,
  type CostSettings, type UserUsage,
} from '@/lib/admin/costs'

/** Tables whose row count stands in for a user's storage footprint. */
const FOOTPRINT_TABLES = [
  'trades', 'account_snapshots', 'mt5_candles', 'journal_entries',
  'portfolio_holdings', 'tasks', 'habit_completions',
] as const

async function loadSettings(sb: ReturnType<typeof serviceClient>): Promise<CostSettings> {
  const { data } = await sb.from('admin_cost_settings').select('*').eq('id', 1).maybeSingle()
  if (!data) return DEFAULT_COST_SETTINGS
  const num = (v: unknown, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return {
    serverMonthlyEur:   num(data.server_monthly_eur,   DEFAULT_COST_SETTINGS.serverMonthlyEur),
    hostingMonthlyEur:  num(data.hosting_monthly_eur,  DEFAULT_COST_SETTINGS.hostingMonthlyEur),
    databaseMonthlyEur: num(data.database_monthly_eur, DEFAULT_COST_SETTINGS.databaseMonthlyEur),
    domainMonthlyEur:   num(data.domain_monthly_eur,   DEFAULT_COST_SETTINGS.domainMonthlyEur),
    terminalCapacity:   num(data.terminal_capacity,    DEFAULT_COST_SETTINGS.terminalCapacity),
    aiCostPerCallEur:   num(data.ai_cost_per_call_eur, DEFAULT_COST_SETTINGS.aiCostPerCallEur),
    pricePro:           num(data.price_pro_eur,        DEFAULT_COST_SETTINGS.pricePro),
    priceUltra:         num(data.price_ultra_eur,      DEFAULT_COST_SETTINGS.priceUltra),
  }
}

/**
 * GET /api/dev/costs — per-user usage and what it costs.
 *
 * Terminal counts come from the provisioner, which is the only thing that knows
 * what is actually running on the box; if it cannot be reached the report still
 * renders, with terminals reported as unknown rather than silently zero — a
 * zero would understate exactly the cost this page exists to show.
 */
export async function GET(req: NextRequest) {
  if (!isDevAuthed(req)) return devUnauthorized()
  const sb = serviceClient()

  const settings = await loadSettings(sb)

  const { data: profiles } = await sb
    .from('user_profiles')
    .select('id, email, subscription_tier, last_seen_at')

  const users = profiles ?? []
  const ids = users.map(u => u.id)

  // Row footprint per user, one grouped pass per table.
  const rowCounts = new Map<string, number>()
  await Promise.all(FOOTPRINT_TABLES.map(async table => {
    for (const id of ids) {
      const { count } = await sb.from(table).select('*', { count: 'exact', head: true }).eq('user_id', id)
      rowCounts.set(id, (rowCounts.get(id) ?? 0) + (count ?? 0))
    }
  }))

  const shotCounts = new Map<string, number>()
  await Promise.all(ids.map(async id => {
    const { count } = await sb
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)
      .not('screenshot_close_url', 'is', null)
    shotCounts.set(id, count ?? 0)
  }))

  // AI requests this calendar month.
  const monthStart = new Date()
  monthStart.setDate(1)
  const { data: aiRows } = await sb
    .from('ai_usage')
    .select('user_id, count')
    .gte('day', monthStart.toISOString().slice(0, 10))
  const aiCounts = new Map<string, number>()
  for (const r of aiRows ?? []) {
    aiCounts.set(r.user_id, (aiCounts.get(r.user_id) ?? 0) + (r.count ?? 0))
  }

  // Live terminal slots, straight from the provisioner — the only thing that
  // knows what is actually running. `/capacity` gives the box total and
  // `/provision/:id/slots` the per-user count; both are already routed through
  // the bridge's nginx allowlist.
  const terminalCounts = new Map<string, number>()
  let terminalsKnown = false
  let liveCapacity: number | null = null
  const bridgeUrl = process.env.BRIDGE_URL
  const adminToken = process.env.BRIDGE_ADMIN_TOKEN

  if (bridgeUrl && adminToken) {
    const auth = { Authorization: `Bearer ${adminToken}` }
    try {
      const cap = await fetch(`${bridgeUrl}/capacity`, {
        headers: auth, signal: AbortSignal.timeout(6000), cache: 'no-store',
      })
      if (cap.ok) {
        const body = await cap.json().catch(() => null) as { max?: number } | null
        if (typeof body?.max === 'number' && body.max > 0) liveCapacity = body.max
      }

      const counts = await Promise.all(ids.map(async id => {
        try {
          const res = await fetch(`${bridgeUrl}/provision/${id}/slots`, {
            headers: auth, signal: AbortSignal.timeout(6000), cache: 'no-store',
          })
          if (!res.ok) return null
          const body = await res.json().catch(() => null) as { count?: number } | null
          return { id, count: typeof body?.count === 'number' ? body.count : 0 }
        } catch { return null }
      }))
      // Only claim the numbers are known if every lookup answered — a partial
      // read would understate exactly the cost this page exists to surface.
      if (counts.every(c => c !== null)) {
        for (const c of counts) terminalCounts.set(c!.id, c!.count)
        terminalsKnown = true
      }
    } catch { /* terminalsKnown stays false */ }
  }

  const usage: UserUsage[] = users.map(u => {
    const tier = (u.subscription_tier ?? 'free').toLowerCase()
    return {
      id:    u.id,
      email: u.email ?? null,
      tier:  tier === 'pro' || tier === 'ultra' ? tier : 'free',
      terminals:   terminalCounts.get(u.id) ?? 0,
      aiCalls:     aiCounts.get(u.id) ?? 0,
      rows:        rowCounts.get(u.id) ?? 0,
      screenshots: shotCounts.get(u.id) ?? 0,
      lastSeen:    u.last_seen_at ?? null,
    }
  })

  // The box's real capacity beats the configured guess when it answers.
  const effective: CostSettings = liveCapacity
    ? { ...settings, terminalCapacity: liveCapacity }
    : settings

  return NextResponse.json({
    ...buildCostReport(usage, effective),
    settings: effective,
    terminalsKnown,
    capacityFromBridge: liveCapacity !== null,
  })
}

/** PATCH /api/dev/costs — edit the cost model without a deploy. */
export async function PATCH(req: NextRequest) {
  if (!isDevAuthed(req)) return devUnauthorized()
  const sb = serviceClient()

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const FIELDS = [
    'server_monthly_eur', 'hosting_monthly_eur', 'database_monthly_eur',
    'domain_monthly_eur', 'terminal_capacity', 'ai_cost_per_call_eur',
    'price_pro_eur', 'price_ultra_eur',
  ] as const

  const update: Record<string, number> = {}
  for (const key of FIELDS) {
    if (body[key] === undefined) continue
    const n = Number(body[key])
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: `${key} must be a number ≥ 0` }, { status: 400 })
    }
    update[key] = key === 'terminal_capacity' ? Math.max(1, Math.round(n)) : n
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { error } = await sb
    .from('admin_cost_settings')
    .upsert({ id: 1, ...update, updated_at: new Date().toISOString() }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
