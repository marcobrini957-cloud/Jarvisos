// Pure trading statistics — no React, no Supabase. Unit-tested in tests/stats.test.ts.
import type { Trade } from '@/types'

export interface TradeStats {
  monthPnl:        number
  weekPnl:         number
  winRate:         number
  totalTrades:     number
  decidedTrades:   number     // wins + losses; the denominator behind winRate/expectancy
  avgRR:           number
  maxDrawdown:     number
  xauWinRate:      number
  nasWinRate:      number
  londonWinRate:   number
  nyWinRate:       number
  weeklyPnl:       number[]   // last 7 weeks
  // Professional metrics
  profitFactor:    number     // gross wins / gross losses (99 = no losses)
  expectancy:      number     // EUR expected value per trade
  avgWin:          number     // average EUR per winning trade
  avgLoss:         number     // average absolute EUR per losing trade
  maxConsecWins:   number
  maxConsecLosses: number
}

/**
 * Break-even is a question about DISTANCE, not about money.
 *
 * This used to be a flat ±€10 on net profit, which is size-blind and therefore
 * wrong for everyone: €10 is a real loss on 0.01 lots and rounding error on a
 * full lot. Two traders taking the identical setup got different verdicts
 * purely because one of them sized bigger — and with real users arriving, every
 * one of them would have needed a different number.
 *
 * Pips already solve this. A pip is price movement normalised per instrument,
 * so the euro value of a fixed pip threshold scales with position size on its
 * own:
 *
 *      10 pips on gold  =  €0.90 at 0.01 lots
 *                       =  €18   at 0.20 lots
 *                       =  €90   at 1.00 lot
 *
 * All three are the same event — the market barely moved — and all three now
 * classify the same way, with no per-user configuration anywhere.
 */
export const BE_PIPS = 7

/** Bounds for the per-user setting — matches the CHECK in supabase-be-pips.sql. */
export const BE_PIPS_MIN = 1
export const BE_PIPS_MAX = 25

export function clampBePips(v: unknown): number {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return BE_PIPS
  return Math.min(BE_PIPS_MAX, Math.max(BE_PIPS_MIN, n))
}

/**
 * The second axis. A trade is decided only if it was meaningful in BOTH — it
 * moved far enough AND it actually cost or made something.
 *
 * Distance alone is not enough, and getting that wrong produced eight "losses"
 * in a month that had two: four were BTCUSD test fills worth 17 to 119 cents,
 * one was a 15-pip clip on 0.01 lots that cost €1.36. Real movement, no money.
 * Nobody would call any of those a losing trade.
 *
 * The two axes cover each other's blind spot:
 *   · €50 lost on a full lot is 5 pips — trivial move, real money  → scratch
 *   · €1.36 lost on 0.01 lots is 15 pips — real move, trivial money → scratch
 *   · €173 lost on 0.10 lots is 198 pips — both real               → LOSS
 */
export const BE_MONEY = 10

/**
 * Rows with no pip data — hand-entered trades and CSV imports — fall back to
 * money per lot: on every instrument this product handles, one pip is about
 * €10 per full lot. Still size-normalised.
 */
export const PER_LOT_PER_PIP = 10

/** The minimum a row needs before it can be judged. */
export type Scoreable = Pick<Trade, 'net_profit' | 'pips' | 'lot_size'>

/**
 * Uses the default threshold. To classify against a user's own setting, take a
 * bound set from `makeClassifier` — deliberately the only way to vary it, so
 * that `rows.map(tradeResult)` cannot quietly pass the array index in as a
 * threshold. That trap cost a confusing test failure the moment it existed.
 */
export function tradeResult(t: Scoreable): 'win' | 'breakeven' | 'loss' {
  return classify(t, BE_PIPS)
}

function classify(t: Scoreable, bePips: number, beMoney: number = BE_MONEY): 'win' | 'breakeven' | 'loss' {
  const pnl  = t.net_profit ?? 0
  const pips = t.pips

  // Trivial money is a scratch however far price travelled.
  if (Math.abs(pnl) < beMoney) return 'breakeven'

  // Trivial movement is a scratch however much money changed hands.
  if (pips != null && Number.isFinite(pips)) {
    if (Math.abs(pips) < bePips) return 'breakeven'
  } else {
    const lots = t.lot_size ?? 0
    if (lots > 0 && Math.abs(pnl) / lots < bePips * PER_LOT_PER_PIP) return 'breakeven'
  }

  // Past the scratch band, the money decides — a 40-pip move that still came
  // out negative after commission and swap cost you money, and should say so.
  if (pnl > 0) return 'win'
  if (pnl < 0) return 'loss'
  return 'breakeven'
}

// Predicates, so no call site has to restate the rule. The raw inline
// comparison they replace was duplicated across ten files, which is exactly how
// a single definition drifts out of reach.
export const isWin       = (t: Scoreable) => classify(t, BE_PIPS) === 'win'
export const isLoss      = (t: Scoreable) => classify(t, BE_PIPS) === 'loss'
export const isBreakeven = (t: Scoreable) => classify(t, BE_PIPS) === 'breakeven'

/**
 * A set of predicates bound to one user's threshold.
 *
 * Threading a scalar through every filter in the product would be thirty
 * signatures of noise, and a module-level "current threshold" would be a data
 * race on the server, where one process serves many users at once. Binding it
 * once per render or per request is neither.
 */
export interface Classifier {
  bePips:      number
  tradeResult: (t: Scoreable) => 'win' | 'breakeven' | 'loss'
  isWin:       (t: Scoreable) => boolean
  isLoss:      (t: Scoreable) => boolean
  isBreakeven: (t: Scoreable) => boolean
}

export function makeClassifier(bePips: number = BE_PIPS): Classifier {
  const p = clampBePips(bePips)
  return {
    bePips:      p,
    tradeResult: t => classify(t, p),
    isWin:       t => classify(t, p) === 'win',
    isLoss:      t => classify(t, p) === 'loss',
    isBreakeven: t => classify(t, p) === 'breakeven',
  }
}

// A real trade has a real symbol (not the 'BALANCE' sentinel) and lot_size > 0.
export function isRealTrade(t: Trade) {
  return t.symbol !== 'BALANCE' && !!t.symbol && (t.lot_size ?? 0) > 0
}


export function computeStats(allRows: Trade[], bePips: number = BE_PIPS): TradeStats {
  const { isWin, isLoss, tradeResult } = makeClassifier(bePips)
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Real trades only — used for all stats (P&L, win-rate, R:R, symbol/session)
  // Balance ops (withdrawals/deposits) are intentionally excluded from P&L.
  const realClosed = allRows.filter(t => t.status === 'closed' && t.net_profit !== null && isRealTrade(t))

  // P&L — real trades ONLY (withdrawals do not affect trading P&L)
  const monthly  = realClosed.filter(t => t.close_time && new Date(t.close_time) >= monthStart)
  const weekly   = realClosed.filter(t => t.close_time && new Date(t.close_time) >= weekStart)
  const monthPnl = monthly.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const weekPnl  = weekly.reduce((s,  t) => s + (t.net_profit ?? 0), 0)

  // Win rate — wins/losses only, break-even trades excluded from denominator
  const wins      = realClosed.filter(t => isWin(t))
  const losses    = realClosed.filter(t => isLoss(t))
  const decisive  = wins.length + losses.length
  const winRate   = decisive > 0 ? (wins.length / decisive) * 100 : 0

  // Professional metrics
  const grossWins    = wins.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const grossLosses  = Math.abs(losses.reduce((s, t) => s + (t.net_profit ?? 0), 0))
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 99 : 0
  const avgWin       = wins.length   > 0 ? grossWins   / wins.length   : 0
  const avgLoss      = losses.length > 0 ? grossLosses / losses.length : 0
  const wr100        = decisive > 0 ? wins.length   / decisive : 0
  const lr100        = decisive > 0 ? losses.length / decisive : 0
  const expectancy   = wr100 * avgWin - lr100 * avgLoss

  // Max consecutive wins/losses (needs chronological order)
  const chrono = [...realClosed].sort((a, b) =>
    (a.close_time ?? '').localeCompare(b.close_time ?? ''))
  let maxConsecWins = 0, maxConsecLosses = 0, curW = 0, curL = 0
  for (const t of chrono) {
    const r = tradeResult(t)
    if (r === 'win')  { curW++; curL = 0; if (curW > maxConsecWins)   maxConsecWins   = curW }
    if (r === 'loss') { curL++; curW = 0; if (curL > maxConsecLosses) maxConsecLosses = curL }
    // breakeven: preserve both streaks
  }

  // Avg Realized R:R — actual exit vs entry, measured in units of initial risk (entry → SL)
  // Requires SL, open price, close price. No TP needed — reflects what actually happened.
  const rrTrades = realClosed.filter(t => t.stop_loss && t.open_price && t.close_price && t.trade_type)
  const avgRR    = rrTrades.length > 0
    ? rrTrades.reduce((s, t) => {
        const dir      = t.trade_type === 'buy' ? 1 : -1
        const realized = dir * ((t.close_price ?? 0) - (t.open_price ?? 0))
        const risk     = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
        return s + (risk > 0 ? realized / risk : 0)
      }, 0) / rrTrades.length
    : 0

  // Max drawdown — worst single-day P&L (real trades only)
  const byDay = new Map<string, number>()
  for (const t of realClosed) {
    if (!t.close_time) continue
    const day = t.close_time.split('T')[0]
    byDay.set(day, (byDay.get(day) ?? 0) + (t.net_profit ?? 0))
  }
  const maxDrawdown = Math.min(0, ...Array.from(byDay.values()))

  // Symbol win rates (BE excluded from denominator)
  const xau    = realClosed.filter(t => t.symbol?.includes('XAU'))
  const nas    = realClosed.filter(t => t.symbol?.includes('NAS') || t.symbol?.includes('US100'))
  const wrOf   = (ts: Trade[]) => { const w = ts.filter(t => isWin(t)).length; const l = ts.filter(t => isLoss(t)).length; return (w + l) > 0 ? (w / (w + l)) * 100 : 0 }
  const xauWR  = wrOf(xau)
  const nasWR  = wrOf(nas)

  // Session win rates (BE excluded)
  const london   = realClosed.filter(t => t.session === 'london')
  const ny       = realClosed.filter(t => t.session === 'new_york')
  const londonWR = wrOf(london)
  const nyWR     = wrOf(ny)

  // Last 7 weeks P&L — aligned to calendar Mon–Sun weeks (matches MT5 weekly P&L)
  const weeklyPnl: number[] = []
  const currentMonday = new Date(now)
  const dow = currentMonday.getDay()
  currentMonday.setDate(currentMonday.getDate() - (dow === 0 ? 6 : dow - 1))
  currentMonday.setHours(0, 0, 0, 0)

  for (let i = 6; i >= 0; i--) {
    // i=6 → 6 weeks ago (oldest), i=0 → current week (newest)
    const wStart = new Date(currentMonday)
    wStart.setDate(wStart.getDate() - i * 7)
    const wEnd = new Date(wStart)
    wEnd.setDate(wEnd.getDate() + 7)

    const wPnl = realClosed
      .filter(t => t.close_time && new Date(t.close_time) >= wStart && new Date(t.close_time) < wEnd)
      .reduce((s, t) => s + (t.net_profit ?? 0), 0)
    weeklyPnl.push(parseFloat(wPnl.toFixed(2)))
  }

  return {
    monthPnl:        parseFloat(monthPnl.toFixed(2)),
    weekPnl:         parseFloat(weekPnl.toFixed(2)),
    winRate:         parseFloat(winRate.toFixed(1)),
    totalTrades:     realClosed.length,
    decidedTrades:   decisive,
    avgRR:           parseFloat(avgRR.toFixed(2)),
    maxDrawdown:     parseFloat(maxDrawdown.toFixed(2)),
    xauWinRate:      parseFloat(xauWR.toFixed(1)),
    nasWinRate:      parseFloat(nasWR.toFixed(1)),
    londonWinRate:   parseFloat(londonWR.toFixed(1)),
    nyWinRate:       parseFloat(nyWR.toFixed(1)),
    weeklyPnl,
    profitFactor:    parseFloat(profitFactor.toFixed(2)),
    expectancy:      parseFloat(expectancy.toFixed(2)),
    avgWin:          parseFloat(avgWin.toFixed(2)),
    avgLoss:         parseFloat(avgLoss.toFixed(2)),
    maxConsecWins,
    maxConsecLosses,
  }
}
