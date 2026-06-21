import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function GET() {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token     = process.env.METAAPI_TOKEN!
  const accountId = process.env.MT5_ACCOUNT_ID!
  const base      = 'https://mt-client-api-v1.london.agiliumtrade.ai'

  // Full year from Jan 1 of current year
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
  const to        = new Date().toISOString()
  // Also last 90 days (original window)
  const from90    = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const headers = { 'auth-token': token, 'Content-Type': 'application/json' }

  const [acctRes, dealsYearRes, deals90Res] = await Promise.all([
    fetch(`${base}/users/current/accounts/${accountId}/account-information`, { headers, cache: 'no-store' }),
    fetch(`${base}/users/current/accounts/${accountId}/history-deals/time/${yearStart}/${to}`, { headers, cache: 'no-store' }),
    fetch(`${base}/users/current/accounts/${accountId}/history-deals/time/${from90}/${to}`, { headers, cache: 'no-store' }),
  ])

  const [acct, dealsYear, deals90] = await Promise.all([
    acctRes.json(), dealsYearRes.json(), deals90Res.json(),
  ])

  // Separate balance ops from real trades
  const allDealsYear  = Array.isArray(dealsYear) ? dealsYear  : []
  const allDeals90    = Array.isArray(deals90)   ? deals90    : []

  const balanceDeals  = allDealsYear.filter((d: {type: string}) => d.type === 'DEAL_TYPE_BALANCE')
  const tradeDeals    = allDealsYear.filter((d: {type: string; symbol?: string}) =>
    ['DEAL_TYPE_BUY', 'DEAL_TYPE_SELL'].includes(d.type) && d.symbol
  )

  // Sum of trade profits from MetaAPI (DEAL_ENTRY_OUT only — closed positions)
  const closedTradePnl = tradeDeals
    .filter((d: {entryType: string}) => d.entryType === 'DEAL_ENTRY_OUT')
    .reduce((s: number, d: {profit: number; commission: number; swap: number}) =>
      s + (d.profit ?? 0) + (d.commission ?? 0) + (d.swap ?? 0), 0)

  const balancePnl = balanceDeals.reduce((s: number, d: {profit: number}) => s + (d.profit ?? 0), 0)

  // What's in Supabase right now (reuse authenticated client)
  const supabase = supabaseAuth
  const { data: dbTrades } = await supabase
    .from('trades')
    .select('symbol, lot_size, net_profit, close_time, trade_type')
    .eq('status', 'closed')
    .order('close_time', { ascending: false })
    .limit(5)

  const { data: dbStats } = await supabase
    .from('trades')
    .select('symbol, lot_size, net_profit')
    .eq('status', 'closed')

  const yearSince = new Date(new Date().getFullYear(), 0, 1)
  const dbYearPnl = (dbStats ?? [])
    .filter((t: {lot_size: number | null; symbol: string | null}) =>
      t.symbol && (t.lot_size ?? 0) > 0
    )
    .reduce((s: number, t: {net_profit: number | null}) => s + (t.net_profit ?? 0), 0)

  const dbBalanceOps = (dbStats ?? []).filter(
    (t: {symbol: string | null}) => t.symbol === 'BALANCE'
  )

  return NextResponse.json({
    account: {
      balance:  acct.balance,
      equity:   acct.equity,
      currency: acct.currency,
    },
    metaapi: {
      yearRange:          `${yearStart.slice(0,10)} → ${to.slice(0,10)}`,
      totalDealsYear:     allDealsYear.length,
      totalDeals90days:   allDeals90.length,
      balanceOpsCount:    balanceDeals.length,
      balanceDeals:       balanceDeals,           // full list so we can see structure
      closedTradePnlYear: parseFloat(closedTradePnl.toFixed(2)),
      balancePnlYear:     parseFloat(balancePnl.toFixed(2)),
      netYear:            parseFloat((closedTradePnl + balancePnl).toFixed(2)),
    },
    supabase: {
      dbYearPnl:          parseFloat(dbYearPnl.toFixed(2)),
      dbTotalRows:        (dbStats ?? []).length,
      dbBalanceOpsCount:  dbBalanceOps.length,
      dbBalanceOps:       dbBalanceOps,
      recentTrades:       dbTrades,
    },
  })
}
