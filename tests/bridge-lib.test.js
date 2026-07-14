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
import { versionLt, mapOpenPosition, mapClosedTrade, mergeSettings, SETTINGS_DEFAULTS } from '../bridge/lib.js'

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
