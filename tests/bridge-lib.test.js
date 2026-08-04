import { describe, it, expect } from 'vitest'
import { detectSession, calcPips, mergeByTicket } from '../bridge/lib.js'

describe('bridge detectSession (ms timestamps)', () => {
  it('NY: 13:30–22:00 UTC', () => {
    expect(detectSession(Date.UTC(2026, 6, 13, 13, 30))).toBe('new_york')
    expect(detectSession(Date.UTC(2026, 6, 13, 21, 59))).toBe('new_york')
  })
  it('London: 08:00–13:29 UTC (NY wins the overlap)', () => {
    expect(detectSession(Date.UTC(2026, 6, 13, 8, 0))).toBe('london')
    expect(detectSession(Date.UTC(2026, 6, 13, 13, 29))).toBe('london')
  })
  it('Asian otherwise', () => {
    expect(detectSession(Date.UTC(2026, 6, 13, 22, 0))).toBe('asian')
    expect(detectSession(Date.UTC(2026, 6, 13, 3, 0))).toBe('asian')
  })
})

describe('bridge calcPips', () => {
  it('matches the EA-side pip conventions', () => {
    expect(calcPips('XAUUSD', 2000, 2010, 'buy')).toBe(100)
    expect(calcPips('USDJPY', 150.0, 150.5, 'buy')).toBe(50)
    expect(calcPips('NAS100', 20000, 20100, 'buy')).toBe(100)
    expect(calcPips('US30', 40000, 39900, 'sell')).toBe(100)
    expect(calcPips('DAX40', 18000, 18050, 'buy')).toBe(50)
    expect(calcPips('EURUSD', 1.1, 1.105, 'buy')).toBe(50)
  })
  it('sell direction inverts the sign', () => {
    expect(calcPips('EURUSD', 1.1, 1.105, 'sell')).toBe(-50)
  })
})

// ── v2 helpers ───────────────────────────────────────────────────────────────
import { versionLt, mapOpenPosition, mapClosedTrade, mapBalanceOp, mergeSettings, SETTINGS_DEFAULTS, serverSecToUtcMs } from '../bridge/lib.js'

describe('bridge versionLt', () => {
  it('orders dotted versions numerically', () => {
    expect(versionLt('1.99', '2.00')).toBe(true)
    expect(versionLt('2.00', '2.00')).toBe(false)
    expect(versionLt('2.10', '2.00')).toBe(false)
    expect(versionLt('2.0.1', '2.0')).toBe(false)
    expect(versionLt('10.0', '9.9')).toBe(false)
  })
  it('treats garbage/missing as older than everything', () => {
    expect(versionLt(undefined, '2.00')).toBe(true)
    expect(versionLt('abc', '2.00')).toBe(true)
    expect(versionLt('2.00', 'abc')).toBe(false)
  })
})

describe('bridge trade row mappers', () => {
  const open = { ticket: 123, symbol: 'XAUUSD', trade_type: 0, lot_size: 0.5, open_price: 2000, current_price: 2010, profit: 100, commission: -2, swap: -1, open_time: 1780000000 }
  it('mapOpenPosition builds an open trades row', () => {
    const r = mapOpenPosition(open, 'user-1')
    expect(r.user_id).toBe('user-1')
    expect(r.mt5_ticket).toBe('123')
    expect(r.trade_type).toBe('buy')
    expect(r.status).toBe('open')
    expect(r.close_time).toBeNull()
    expect(r.net_profit).toBe(97)
    expect(r.pips).toBe(100)
  })
  it('mapClosedTrade builds a closed trades row with duration', () => {
    const r = mapClosedTrade({ ...open, trade_type: 1, close_price: 1990, close_time: open.open_time + 3600 }, 'user-1')
    expect(r.trade_type).toBe('sell')
    expect(r.status).toBe('closed')
    expect(r.duration_minutes).toBe(60)
    expect(r.pips).toBe(100) // sell 2000→1990 on gold = +100 pips
  })
})

describe('bridge mergeSettings', () => {
  it('returns defaults for null/garbage rows', () => {
    expect(mergeSettings(null)).toEqual({ ...SETTINGS_DEFAULTS })
    expect(mergeSettings('junk')).toEqual({ ...SETTINGS_DEFAULTS })
  })
  it('accepts valid overrides and rejects invalid ones', () => {
    const s = mergeSettings({ maintenance_mode: true, rate_limit_sync: 500, rate_limit_copy: -5, min_ea_version: '2.10' })
    expect(s.maintenance_mode).toBe(true)
    expect(s.rate_limit_sync).toBe(500)
    expect(s.rate_limit_copy).toBe(SETTINGS_DEFAULTS.rate_limit_copy)
    expect(s.min_ea_version).toBe('2.10')
    expect(mergeSettings({ min_ea_version: 'DROP TABLE' }).min_ea_version).toBe(SETTINGS_DEFAULTS.min_ea_version)
  })
})

describe('bridge mapBalanceOp', () => {
  it('maps a deposit to a BALANCE row the app can read', () => {
    const r = mapBalanceOp({ ticket: 991, kind: 'balance', amount: 249.34, time: 1784110214, comment: 'Deposit' }, 'u1')
    expect(r.symbol).toBe('BALANCE')
    expect(r.net_profit).toBe(249.34)
    expect(r.status).toBe('closed')
    expect(r.notes).toBe('Deposit')
    // negated so a deal ticket can never collide with a position id
    expect(r.mt5_ticket).toBe(-991)
  })

  it('maps a withdrawal as a negative amount', () => {
    const r = mapBalanceOp({ ticket: 992, kind: 'balance', amount: -500, time: 1784110214 }, 'u1')
    expect(r.net_profit).toBe(-500)
    expect(r.trade_type).toBe('sell')
  })

  it('drops zero and malformed operations', () => {
    expect(mapBalanceOp({ ticket: 1, amount: 0, time: 1784110214 }, 'u1')).toBeNull()
    expect(mapBalanceOp({ ticket: 2, amount: 'x', time: 1784110214 }, 'u1')).toBeNull()
    expect(mapBalanceOp({ ticket: 3, amount: 10, time: 0 }, 'u1')).toBeNull()
    expect(mapBalanceOp(null, 'u1')).toBeNull()
  })
})

describe('bridge server-time normalisation', () => {
  it('subtracts the broker GMT offset so stamps land in real UTC', () => {
    // Blueberry runs GMT+3 in summer. A deposit MetaAPI recorded at 09:50:14Z
    // arrived from the EA as 12:50:14 server time — the same event, 3h apart.
    const serverSec = Math.floor(Date.UTC(2026, 6, 13, 12, 50, 14) / 1000)
    expect(serverSecToUtcMs(serverSec, 3 * 3600))
      .toBe(Date.UTC(2026, 6, 13, 9, 50, 14))
  })

  it('leaves stamps untouched when an older EA sends no offset', () => {
    const sec = Math.floor(Date.UTC(2026, 6, 13, 12, 0, 0) / 1000)
    expect(serverSecToUtcMs(sec, 0)).toBe(Date.UTC(2026, 6, 13, 12, 0, 0))
    expect(serverSecToUtcMs(sec, undefined)).toBe(Date.UTC(2026, 6, 13, 12, 0, 0))
  })

  it('applies the offset through the trade mapper, including the session label', () => {
    const openSec = Math.floor(Date.UTC(2026, 6, 13, 12, 0, 0) / 1000)  // 09:00 UTC = London
    const r = mapClosedTrade({
      ticket: 1, symbol: 'XAUUSD', trade_type: 0, lot_size: 0.1,
      open_price: 2000, close_price: 2010, open_time: openSec, close_time: openSec + 3600,
      profit: 10, commission: 0, swap: 0,
    }, 'u1', 3 * 3600)
    expect(r.open_time).toBe('2026-07-13T09:00:00.000Z')
    expect(r.session).toBe('london')
  })

  it('applies the offset to balance operations', () => {
    const sec = Math.floor(Date.UTC(2026, 6, 13, 12, 50, 14) / 1000)
    const r = mapBalanceOp({ ticket: 52021395, amount: 249.34, time: sec }, 'u1', 3 * 3600)
    expect(r.close_time).toBe('2026-07-13T09:50:14.000Z')
  })
})

// ── mergeByTicket ────────────────────────────────────────────────────────────
// A position closed in parts arrives as several deals under one ticket. This is
// the function that stops that taking a user's entire sync down with it.
describe('mergeByTicket', () => {
  const row = (ticket, close, money, lots = 0.5) => ({
    mt5_ticket: String(ticket),
    open_time:  '2026-08-01T10:00:00.000Z',
    close_time: close,
    lot_size:   lots,
    profit_usd: money,
    commission: -1,
    swap:       0,
    net_profit: money - 1,
    close_price: money,        // stands in for "whatever the exit looked like"
    status: 'closed',
  })

  it('leaves distinct tickets alone', () => {
    const out = mergeByTicket([row(1, '2026-08-01T11:00:00.000Z', 10), row(2, '2026-08-01T12:00:00.000Z', 20)])
    expect(out).toHaveLength(2)
  })

  it('collapses partial closes into one row per position', () => {
    const out = mergeByTicket([
      row(49066312, '2026-08-01T11:00:00.000Z', 7.1),
      row(49066312, '2026-08-01T11:30:00.000Z', 0.14),
    ])
    expect(out).toHaveLength(1)
  })

  it('adds up the money, so no partial close is silently lost', () => {
    const [merged] = mergeByTicket([
      row(1, '2026-08-01T11:00:00.000Z', 10),
      row(1, '2026-08-01T12:00:00.000Z', 5),
    ])
    expect(merged.profit_usd).toBe(15)
    expect(merged.net_profit).toBe(13)      // (10-1) + (5-1)
    expect(merged.commission).toBe(-2)
    expect(merged.lot_size).toBe(1)         // 0.5 out, then 0.5 out
  })

  it('runs from the first open to the last close, whatever order they arrive in', () => {
    const [merged] = mergeByTicket([
      { ...row(1, '2026-08-01T14:00:00.000Z', 5), open_time: '2026-08-01T09:00:00.000Z' },
      { ...row(1, '2026-08-01T11:00:00.000Z', 10), open_time: '2026-08-01T10:00:00.000Z' },
    ])
    expect(merged.open_time).toBe('2026-08-01T09:00:00.000Z')
    expect(merged.close_time).toBe('2026-08-01T14:00:00.000Z')
    expect(merged.duration_minutes).toBe(300)
  })

  it('prices the exit by volume rather than by the last deal', () => {
    // Written the other way round when this was first added — "the exit comes
    // from the final deal" — which is the bug the weighted average exists to
    // fix. Equal halves at 5 and 10 exit at 7.5, whatever order they arrive in.
    const [merged] = mergeByTicket([
      row(1, '2026-08-01T14:00:00.000Z', 5),
      row(1, '2026-08-01T11:00:00.000Z', 10),
    ])
    expect(merged.close_price).toBeCloseTo(7.5, 6)
  })

  it('never emits two rows with the same conflict key', () => {
    const rows = [1, 1, 1, 2, 2, 3].map((t, i) => row(t, `2026-08-01T1${i}:00:00.000Z`, i))
    const keys = mergeByTicket(rows).map(r => r.mt5_ticket)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

// A scale-out has to end up with the verdict the whole position earned, not the
// one its last slice did — `pips` is what decides win/loss/scratch.
describe('mergeByTicket — the exit of a scaled-out position', () => {
  const deal = (close, lots, price) => ({
    mt5_ticket: '77', symbol: 'XAUUSD', trade_type: 'buy',
    open_time: '2026-08-01T10:00:00.000Z', close_time: close,
    open_price: 4000, close_price: price,
    lot_size: lots, profit_usd: 0, commission: 0, swap: 0, net_profit: 0,
    pips: calcPips('XAUUSD', 4000, price, 'buy'),
  })

  it('prices the exit by volume, not by whichever closed last', () => {
    // Half out at +50 pips, the rest trailed out at +2.
    const [m] = mergeByTicket([
      deal('2026-08-01T11:00:00.000Z', 0.5, 4005),
      deal('2026-08-01T12:00:00.000Z', 0.5, 4000.2),
    ])
    expect(m.close_price).toBeCloseTo(4002.6, 6)   // (4005 + 4000.2) / 2
    expect(m.lot_size).toBe(1)
  })

  it('rescores the trade on the move the position actually made', () => {
    const [m] = mergeByTicket([
      deal('2026-08-01T11:00:00.000Z', 0.5, 4005),
      deal('2026-08-01T12:00:00.000Z', 0.5, 4000.2),
    ])
    const lastSlice = calcPips('XAUUSD', 4000, 4000.2, 'buy')
    expect(m.pips).toBe(calcPips('XAUUSD', 4000, 4002.6, 'buy'))
    // The bug this exists to stop: a 26-pip trade filed as a 2-pip scratch.
    expect(m.pips).toBeGreaterThan(lastSlice * 5)
  })

  it('weights by size, so a small final clip cannot swing the exit', () => {
    const [m] = mergeByTicket([
      deal('2026-08-01T11:00:00.000Z', 0.9, 4010),
      deal('2026-08-01T12:00:00.000Z', 0.1, 4000),
    ])
    expect(m.close_price).toBeCloseTo(4009, 6)     // 0.9×4010 + 0.1×4000
  })

  it('stays right across three closes, folded pairwise', () => {
    const [m] = mergeByTicket([
      deal('2026-08-01T11:00:00.000Z', 0.4, 4010),
      deal('2026-08-01T12:00:00.000Z', 0.4, 4020),
      deal('2026-08-01T13:00:00.000Z', 0.2, 4030),
    ])
    expect(m.lot_size).toBeCloseTo(1, 6)
    expect(m.close_price).toBeCloseTo(4018, 6)     // .4×4010 + .4×4020 + .2×4030
  })
})
