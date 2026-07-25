import { describe, it, expect } from 'vitest'
import { detectSession, calcPips } from '../bridge/lib.js'

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
