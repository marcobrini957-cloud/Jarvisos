import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const METAAPI_BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai'

async function metaApi(path: string, token: string) {
  const res = await fetch(`${METAAPI_BASE}${path}`, {
    headers: { 'auth-token': token },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MetaAPI ${res.status}: ${text}`)
  }
  return res.json()
}

function detectSession(isoTime: string): string {
  const h = new Date(isoTime).getUTCHours()
  if (h >= 13 && h < 17) return 'overlap'
  if (h >= 8  && h < 13) return 'london'
  if (h >= 17 && h < 22) return 'new_york'
  return 'asian'
}

function calcPips(symbol: string, open: number, close: number, type: 'buy' | 'sell'): number {
  const diff = type === 'buy' ? close - open : open - close
  // Gold: 1 pip = $0.10 movement (so multiply by 10)
  // Indices (NAS100, SP500): 1 pip = 1 point
  // Forex: 1 pip = 0.0001
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
  type: string          // DEAL_TYPE_BUY | DEAL_TYPE_SELL | DEAL_TYPE_BALANCE etc.
  entryType?: string    // DEAL_ENTRY_IN | DEAL_ENTRY_OUT | DEAL_ENTRY_INOUT (absent on balance ops)
  positionId?: string   // absent on balance ops
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

export async function POST(req: NextRequest) {
  try {
    const supabase  = await createClient()
    const token     = process.env.METAAPI_TOKEN
    const accountId = process.env.MT5_ACCOUNT_ID

    if (!token || !accountId) {
      return NextResponse.json({ error: 'MetaAPI credentials not configured' }, { status: 400 })
    }

    // quick=true → only last 14 days (fast, used on page load)
    // quick=false/omitted → full year history (used for deep sync)
    const url   = new URL(req.url)
    const quick = url.searchParams.get('quick') === 'true'

    const from = quick
      ? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Math.min(
          new Date(new Date().getFullYear(), 0, 1).getTime(),
          Date.now() - 400 * 24 * 60 * 60 * 1000
        )).toISOString()
    const to   = new Date().toISOString()

    const [accountInfo, positions, allDeals] = await Promise.all([
      metaApi(`/users/current/accounts/${accountId}/account-information`, token),
      metaApi(`/users/current/accounts/${accountId}/positions`, token),
      metaApi(`/users/current/accounts/${accountId}/history-deals/time/${from}/${to}`, token),
    ])

    // ── Account snapshot ────────────────────────────────────────────────────
    await supabase.from('account_snapshots').insert({
      balance:           accountInfo.balance,
      equity:            accountInfo.equity,
      margin_used:       accountInfo.margin,
      free_margin:       accountInfo.freeMargin,
      margin_level_pct:  accountInfo.marginLevel ?? null,
      open_trades_count: positions.length,
    })

    // ── Sync balance/withdrawal/deposit operations ──────────────────────────
    // Delete all existing balance ops then re-insert fresh from MetaAPI.
    // (lot_size=0 + symbol=null is the marker for balance ops)
    await supabase
      .from('trades')
      .delete()
      .eq('symbol', 'BALANCE')

    const balanceDeals = (allDeals as Deal[]).filter(
      d => d.type === 'DEAL_TYPE_BALANCE' && d.profit != null && d.profit !== 0
    )

    if (balanceDeals.length > 0) {
      const { error: balErr } = await supabase.from('trades').insert(
        balanceDeals.map(deal => ({
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
    // Group deals by positionId
    const byPosition = new Map<string, Deal[]>()
    for (const deal of allDeals as Deal[]) {
      // Skip balance/credit/commission-only deals
      if (!deal.symbol) continue
      if (!['DEAL_TYPE_BUY', 'DEAL_TYPE_SELL'].includes(deal.type)) continue

      const pid = deal.positionId!
      const list = byPosition.get(pid) ?? []
      list.push(deal)
      byPosition.set(pid, list)
    }

    let newTrades     = 0
    let updatedTrades = 0

    for (const [positionId, deals] of byPosition) {
      const entryDeal = deals.find(d => d.entryType === 'DEAL_ENTRY_IN')
      const exitDeals = deals.filter(d => d.entryType === 'DEAL_ENTRY_OUT')

      // Skip if no entry deal or no exit deals (still open — handled below)
      if (!entryDeal || exitDeals.length === 0) continue

      // Sum up exits (could be partial closes)
      const totalProfit     = exitDeals.reduce((s, d) => s + (d.profit     ?? 0), 0)
      const totalCommission = deals.reduce((s, d) => s + (d.commission ?? 0), 0)
      const totalSwap       = exitDeals.reduce((s, d) => s + (d.swap       ?? 0), 0)
      const lastExit        = exitDeals[exitDeals.length - 1]

      const symbol    = entryDeal.symbol!
      const tradeType = entryDeal.type === 'DEAL_TYPE_BUY' ? 'buy' : 'sell'
      const openTime  = entryDeal.time
      const closeTime = lastExit.time
      const pips      = calcPips(symbol, entryDeal.price ?? 0, lastExit.price ?? 0, tradeType as 'buy' | 'sell')
      const duration  = Math.round((new Date(closeTime).getTime() - new Date(openTime).getTime()) / 60000)

      const row = {
        mt5_ticket:       parseInt(positionId),
        symbol,
        trade_type:       tradeType,
        lot_size:         entryDeal.volume,
        open_price:       entryDeal.price,
        close_price:      lastExit.price,
        stop_loss:        entryDeal.stopLoss  ?? null,
        take_profit:      entryDeal.takeProfit ?? null,
        open_time:        openTime,
        close_time:       closeTime,
        duration_minutes: duration,
        pips,
        profit_usd:       totalProfit,      // actually in EUR (account currency)
        commission:       totalCommission,
        swap:             totalSwap,
        net_profit:       totalProfit + totalCommission + totalSwap,
        status:           'closed',
        session:          detectSession(openTime),
        screenshot_missing: true,
      }

      // Upsert by mt5_ticket
      const { data: existing } = await supabase
        .from('trades')
        .select('id, screenshot_open_url, screenshot_close_url')
        .eq('mt5_ticket', parseInt(positionId))
        .single()

      if (existing) {
        await supabase.from('trades').update({
          ...row,
          screenshot_missing: !existing.screenshot_open_url || !existing.screenshot_close_url,
        }).eq('mt5_ticket', parseInt(positionId))
        updatedTrades++
      } else {
        await supabase.from('trades').insert(row)
        newTrades++
      }
    }

    // ── Sync open positions ──────────────────────────────────────────────────
    for (const pos of positions) {
      const tradeType = pos.type === 'POSITION_TYPE_BUY' ? 'buy' : 'sell'
      const openRow = {
        mt5_ticket:        pos.id,
        symbol:            pos.symbol,
        trade_type:        tradeType,
        lot_size:          pos.volume,
        open_price:        pos.openPrice,
        stop_loss:         pos.stopLoss  ?? null,
        take_profit:       pos.takeProfit ?? null,
        open_time:         pos.time,
        profit_usd:        pos.profit,
        commission:        pos.commission ?? 0,
        swap:              pos.swap ?? 0,
        net_profit:        (pos.profit ?? 0) + (pos.commission ?? 0) + (pos.swap ?? 0),
        status:            'open',
        session:           detectSession(pos.time),
        screenshot_missing: true,
      }

      const { data: existing } = await supabase
        .from('trades')
        .select('id')
        .eq('mt5_ticket', pos.id)
        .single()

      if (existing) {
        await supabase.from('trades').update(openRow).eq('mt5_ticket', pos.id)
      } else {
        await supabase.from('trades').insert(openRow)
        newTrades++
      }
    }

    return NextResponse.json({
      ok:            true,
      balance:       accountInfo.balance,
      equity:        accountInfo.equity,
      currency:      accountInfo.currency,
      openPositions: positions.length,
      newTrades,
      updatedTrades,
      balanceOps:    balanceDeals.length,
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
