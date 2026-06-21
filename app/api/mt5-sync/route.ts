import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 60

// MetaAPI regions to try in order (london + new-york currently share IP 57.129.144.25)
const METAAPI_REGIONS = [
  'london',
  'new-york',
]

async function metaApiCall(base: string, path: string, token: string, attempt = 0): Promise<unknown> {
  const res = await fetch(`${base}${path}`, {
    headers: { 'auth-token': token },
    cache: 'no-store',
  })
  if (!res.ok) {
    if (res.status === 504 && attempt === 0) {
      await new Promise(r => setTimeout(r, 3000))
      return metaApiCall(base, path, token, 1)
    }
    const text = await res.text()
    throw new Error(`MetaAPI ${res.status}: ${text}`)
  }
  return res.json()
}

async function metaApi(path: string, token: string): Promise<unknown> {
  let lastErr: Error = new Error('MetaAPI: all regions unreachable')
  for (const region of METAAPI_REGIONS) {
    const base = `https://mt-client-api-v1.${region}.agiliumtrade.ai`
    try {
      return await metaApiCall(base, path, token)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      console.warn(`[mt5-sync] region ${region} failed: ${lastErr.message}`)
    }
  }
  throw lastErr
}

function detectSession(isoTime: string): string {
  const d = new Date(isoTime)
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes()
  // Official forex session hours (UTC, DST-independent):
  // New York:  13:30–22:00 UTC (NYSE 9:30 AM–4:00 PM ET)
  // London:    08:00–16:30 UTC (LSE 8:00 AM–4:30 PM UK)
  // Asian:     22:00–08:00 UTC
  // NY takes priority during London/NY overlap (13:30–16:30 UTC)
  if (mins >= 13 * 60 + 30 && mins < 22 * 60) return 'new_york'
  if (mins >= 8 * 60 && mins < 16 * 60 + 30)  return 'london'
  return 'asian'
}

function calcPips(symbol: string, open: number, close: number, type: 'buy' | 'sell'): number {
  const diff = type === 'buy' ? close - open : open - close
  if (symbol.toUpperCase().includes('XAU') || symbol.toUpperCase().includes('GOLD')) {
    return parseFloat((diff * 10).toFixed(1))
  }
  if (symbol.toUpperCase().includes('NAS') || symbol.toUpperCase().includes('US100') ||
      symbol.toUpperCase().includes('SPX') || symbol.toUpperCase().includes('DOW')) {
    return parseFloat(diff.toFixed(1))
  }
  if (symbol.toUpperCase().includes('JPY')) {
    return parseFloat((diff / 0.01).toFixed(1))
  }
  return parseFloat((diff / 0.0001).toFixed(1))
}

interface Deal {
  id: string
  type: string
  entryType?: string
  positionId?: string
  symbol?: string
  time: string
  price?: number
  volume?: number
  profit: number
  commission: number
  swap: number
  stopLoss?: number
  takeProfit?: number
  brokerComment?: string
  accountCurrencyExchangeRate?: number
}

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: { user } } = await authClient.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const token    = process.env.METAAPI_TOKEN

    if (!token) {
      return NextResponse.json({ error: 'MetaAPI token not configured on server' }, { status: 400 })
    }

    // Read user's MetaAPI account ID from their profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('mt5_account_id')
      .eq('id', userId)
      .single()

    // Fallback to env var so existing single-user setup still works
    const accountId = profile?.mt5_account_id ?? process.env.MT5_ACCOUNT_ID

    if (!accountId) {
      return NextResponse.json({ error: 'No MT5 account connected. Go to Settings to connect your account.' }, { status: 400 })
    }

    const url   = new URL(req.url)
    const quick = url.searchParams.get('quick') === 'true'

    const from = quick
      ? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Math.min(
          new Date(new Date().getFullYear(), 0, 1).getTime(),
          Date.now() - 400 * 24 * 60 * 60 * 1000
        )).toISOString()
    const to = new Date().toISOString()

    const [accountInfo, positions, allDeals] = await Promise.all([
      metaApi(`/users/current/accounts/${accountId}/account-information`, token),
      metaApi(`/users/current/accounts/${accountId}/positions`, token),
      metaApi(`/users/current/accounts/${accountId}/history-deals/time/${from}/${to}`, token),
    ]) as [
      { balance: number; equity: number; margin: number; freeMargin: number; marginLevel?: number; currency: string },
      Array<{ id: number; type: string; symbol: string; volume: number; openPrice: number; stopLoss?: number; takeProfit?: number; time: string; profit: number; commission?: number; swap?: number }>,
      Deal[]
    ]

    console.log(`[mt5-sync] user=${userId} quick=${quick} deals=${allDeals.length} positions=${positions.length}`)

    // ── Account snapshot ────────────────────────────────────────────────────
    await supabase.from('account_snapshots').insert({
      user_id:           userId,
      balance:           accountInfo.balance,
      equity:            accountInfo.equity,
      margin_used:       accountInfo.margin,
      free_margin:       accountInfo.freeMargin,
      margin_level_pct:  accountInfo.marginLevel ?? null,
      open_trades_count: positions.length,
    })

    // ── Sync balance/withdrawal/deposit operations ──────────────────────────
    await supabase
      .from('trades')
      .delete()
      .eq('symbol', 'BALANCE')
      .eq('user_id', userId)

    const balanceDeals = allDeals.filter(
      d => d.type === 'DEAL_TYPE_BALANCE' && d.profit != null && d.profit !== 0
    )

    if (balanceDeals.length > 0) {
      const { error: balErr } = await supabase.from('trades').insert(
        balanceDeals.map(deal => ({
          user_id:            userId,
          symbol:             'BALANCE',
          trade_type:         'buy' as const,
          lot_size:           0,
          open_time:          deal.time,
          close_time:         deal.time,
          profit_usd:         deal.profit,
          commission:         0,
          swap:               0,
          net_profit:         deal.profit,
          status:             'closed' as const,
          notes:              deal.brokerComment ?? null,
          screenshot_missing: false,
        }))
      )
      if (balErr) console.error('[mt5-sync] balance ops insert error:', balErr)
    }

    // ── Build closed trades from deals ──────────────────────────────────────
    const byPosition = new Map<string, Deal[]>()
    for (const deal of allDeals) {
      if (!deal.symbol) continue
      if (!['DEAL_TYPE_BUY', 'DEAL_TYPE_SELL'].includes(deal.type)) continue

      const pid  = deal.positionId!
      const list = byPosition.get(pid) ?? []
      list.push(deal)
      byPosition.set(pid, list)
    }

    // ── Batch-fetch existing trade screenshot info ──────────────────────────
    const closedTickets = [...byPosition.keys()].map(id => parseInt(id)).filter(Boolean)

    const { data: existingRows } = closedTickets.length > 0
      ? await supabase
          .from('trades')
          .select('mt5_ticket, screenshot_open_url, screenshot_close_url, screenshot_missing')
          .in('mt5_ticket', closedTickets)
          .eq('user_id', userId)
      : { data: [] }

    // hasScreenshot = true if any screenshot has been uploaded (open OR close)
    // screenshotMissingOverride = false if user already marked it as not missing
    const screenshotMap = new Map(
      (existingRows ?? []).map(r => [
        r.mt5_ticket as number,
        {
          hasScreenshot: !!(r.screenshot_open_url || r.screenshot_close_url),
          alreadyFalse:  r.screenshot_missing === false,
        },
      ])
    )

    // ── Build all closed trade rows ──────────────────────────────────────────
    const tradesToUpsert: Record<string, unknown>[] = []
    let newTrades     = 0
    let updatedTrades = 0

    for (const [positionId, deals] of byPosition) {
      // Sort by time so we can fall back to positional entry/exit detection
      const sorted = [...deals].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

      // Primary: use entryType. Fallback: first deal = entry, rest = exits
      const entryDeal = sorted.find(d => d.entryType === 'DEAL_ENTRY_IN') ?? sorted[0]
      const exitDeals = sorted.filter(d => d.entryType === 'DEAL_ENTRY_OUT')
        .concat(
          // Fallback: if no DEAL_ENTRY_OUT found, treat all non-entry deals as exits
          sorted.filter(d => d.entryType === 'DEAL_ENTRY_OUT').length === 0
            ? sorted.slice(1)
            : []
        )

      if (!entryDeal || exitDeals.length === 0) continue

      const totalProfit     = exitDeals.reduce((s, d) => s + (d.profit     ?? 0), 0)
      const totalCommission = deals.reduce((s, d)    => s + (d.commission ?? 0), 0)
      const totalSwap       = exitDeals.reduce((s, d) => s + (d.swap       ?? 0), 0)
      const lastExit        = exitDeals[exitDeals.length - 1]

      const symbol    = entryDeal.symbol!
      const tradeType = entryDeal.type === 'DEAL_TYPE_BUY' ? 'buy' : 'sell'
      const openTime  = entryDeal.time
      const closeTime = lastExit.time
      const pips      = calcPips(symbol, entryDeal.price ?? 0, lastExit.price ?? 0, tradeType as 'buy' | 'sell')
      const duration  = Math.round((new Date(closeTime).getTime() - new Date(openTime).getTime()) / 60000)
      const ticket    = parseInt(positionId)
      const existing  = screenshotMap.get(ticket)
      // Never flip screenshot_missing back to true if user already has a screenshot or marked it done
      const screenshotMissing = existing
        ? (!existing.hasScreenshot && !existing.alreadyFalse)
        : true

      tradesToUpsert.push({
        user_id:            userId,
        mt5_ticket:         ticket,
        symbol,
        trade_type:         tradeType,
        lot_size:           entryDeal.volume,
        open_price:         entryDeal.price,
        close_price:        lastExit.price,
        stop_loss:          entryDeal.stopLoss  ?? null,
        take_profit:        entryDeal.takeProfit ?? null,
        open_time:          openTime,
        close_time:         closeTime,
        duration_minutes:   duration,
        pips,
        profit_usd:         totalProfit,
        commission:         totalCommission,
        swap:               totalSwap,
        net_profit:         totalProfit + totalCommission + totalSwap,
        status:             'closed',
        session:            detectSession(openTime),
        screenshot_missing: screenshotMissing,
      })

      if (screenshotMap.has(ticket)) updatedTrades++
      else newTrades++
    }

    // ── Single batch upsert for all closed trades ────────────────────────────
    if (tradesToUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from('trades')
        .upsert(tradesToUpsert, { onConflict: 'mt5_ticket' })
      if (upsertErr) {
        console.error('[mt5-sync] upsert error:', upsertErr)
      } else {
        console.log(`[mt5-sync] upserted ${tradesToUpsert.length} closed trades (${newTrades} new, ${updatedTrades} updated)`)
      }
    }

    // ── Sync open positions (batch upsert) ───────────────────────────────────
    const openRows = positions.map(pos => ({
      user_id:            userId,
      mt5_ticket:         pos.id,
      symbol:             pos.symbol,
      trade_type:         pos.type === 'POSITION_TYPE_BUY' ? 'buy' : 'sell',
      lot_size:           pos.volume,
      open_price:         pos.openPrice,
      stop_loss:          pos.stopLoss  ?? null,
      take_profit:        pos.takeProfit ?? null,
      open_time:          pos.time,
      profit_usd:         pos.profit,
      commission:         pos.commission ?? 0,
      swap:               pos.swap ?? 0,
      net_profit:         (pos.profit ?? 0) + (pos.commission ?? 0) + (pos.swap ?? 0),
      status:             'open',
      session:            detectSession(pos.time),
      screenshot_missing: true,
    }))

    if (openRows.length > 0) {
      const { error: openErr } = await supabase
        .from('trades')
        .upsert(openRows, { onConflict: 'mt5_ticket' })
      if (openErr) console.error('[mt5-sync] open positions upsert error:', openErr)
    }

    // ── Close positions that are no longer open ──────────────────────────────
    // If we had open positions before but they're closed now, deal history handles them above.
    // This is handled by the closed trades upsert (status='closed' overwrites status='open').

    return NextResponse.json({
      ok:            true,
      balance:       accountInfo.balance,
      equity:        accountInfo.equity,
      currency:      accountInfo.currency,
      openPositions: positions.length,
      newTrades,
      updatedTrades,
      balanceOps:    balanceDeals.length,
      dealsProcessed: tradesToUpsert.length,
      syncedAt:      new Date().toISOString(),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mt5-sync] FAILED:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('account_snapshots')
      .select('*')
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .single()
    return NextResponse.json({ snapshot: data ?? null })
  } catch {
    return NextResponse.json({ snapshot: null })
  }
}
