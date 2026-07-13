import { describe, it, expect } from 'vitest'
import { calcPips, detectSession, groupDealsByPosition, buildClosedTradeRows, type Deal } from '@/lib/mt5/parse'

describe('calcPips', () => {
  it('XAU/gold: 1 pip = 0.1', () => {
    expect(calcPips('XAUUSD', 2000, 2010, 'buy')).toBe(100)
    expect(calcPips('XAUUSD', 2000, 2010, 'sell')).toBe(-100)
    expect(calcPips('GOLD', 2000, 1995.5, 'sell')).toBe(45)
  })
  it('indices: 1 pip = 1 point', () => {
    expect(calcPips('NAS100', 20000, 20150.5, 'buy')).toBe(150.5)
    expect(calcPips('US100.cash', 20000, 19900, 'sell')).toBe(100)
    expect(calcPips('SPX500', 5000, 5010, 'buy')).toBe(10)
  })
  it('JPY pairs: 1 pip = 0.01', () => {
    expect(calcPips('USDJPY', 150.00, 150.50, 'buy')).toBe(50)
    expect(calcPips('EURJPY', 160.00, 159.80, 'sell')).toBe(20)
  })
  it('default FX: 1 pip = 0.0001', () => {
    expect(calcPips('EURUSD', 1.1000, 1.1050, 'buy')).toBe(50)
    expect(calcPips('GBPUSD', 1.3000, 1.3025, 'sell')).toBe(-25)
  })
})

describe('detectSession', () => {
  it('NY: 13:30–22:00 UTC, takes priority in the London overlap', () => {
    expect(detectSession('2026-07-13T13:30:00Z')).toBe('new_york')
    expect(detectSession('2026-07-13T16:00:00Z')).toBe('new_york') // overlap → NY
    expect(detectSession('2026-07-13T21:59:00Z')).toBe('new_york')
  })
  it('London: 08:00–16:30 UTC outside the NY window', () => {
    expect(detectSession('2026-07-13T08:00:00Z')).toBe('london')
    expect(detectSession('2026-07-13T13:29:00Z')).toBe('london')
  })
  it('Asian: everything else', () => {
    expect(detectSession('2026-07-13T22:00:00Z')).toBe('asian')
    expect(detectSession('2026-07-13T03:00:00Z')).toBe('asian')
    expect(detectSession('2026-07-13T07:59:00Z')).toBe('asian')
  })
})

let dealSeq = 0
function deal(over: Partial<Deal>): Deal {
  dealSeq++
  return {
    id: `d${dealSeq}`,
    type: 'DEAL_TYPE_BUY',
    positionId: '5001',
    symbol: 'XAUUSD',
    time: '2026-07-10T09:00:00Z',
    price: 2000,
    volume: 0.1,
    profit: 0,
    commission: 0,
    swap: 0,
    ...over,
  }
}

describe('groupDealsByPosition', () => {
  it('groups buy/sell deals by positionId, skipping balance deals and symbol-less deals', () => {
    const map = groupDealsByPosition([
      deal({ positionId: 'a', entryType: 'DEAL_ENTRY_IN' }),
      deal({ positionId: 'a', entryType: 'DEAL_ENTRY_OUT' }),
      deal({ positionId: 'b' }),
      deal({ type: 'DEAL_TYPE_BALANCE' }),      // deposit — skip
      deal({ symbol: undefined }),               // no symbol — skip
    ])
    expect(map.size).toBe(2)
    expect(map.get('a')).toHaveLength(2)
    expect(map.get('b')).toHaveLength(1)
  })
})

describe('buildClosedTradeRows', () => {
  it('builds a closed trade from entry + exit; net = profit + commission + swap', () => {
    const map = groupDealsByPosition([
      deal({ positionId: '7001', entryType: 'DEAL_ENTRY_IN', type: 'DEAL_TYPE_BUY',
             time: '2026-07-10T09:00:00Z', price: 2000, volume: 0.5, commission: -3.5,
             stopLoss: 1990, takeProfit: 2020 }),
      deal({ positionId: '7001', entryType: 'DEAL_ENTRY_OUT', type: 'DEAL_TYPE_SELL',
             time: '2026-07-10T10:30:00Z', price: 2010, profit: 500, commission: -3.5, swap: -1 }),
    ])
    const { rows, newTrades, updatedTrades } = buildClosedTradeRows(map, new Map(), 'user-1')
    expect(rows).toHaveLength(1)
    expect(newTrades).toBe(1)
    expect(updatedTrades).toBe(0)
    const r = rows[0]
    expect(r.mt5_ticket).toBe(7001)
    expect(r.trade_type).toBe('buy')          // entry deal type wins
    expect(r.lot_size).toBe(0.5)
    expect(r.open_price).toBe(2000)
    expect(r.close_price).toBe(2010)
    expect(r.stop_loss).toBe(1990)
    expect(r.take_profit).toBe(2020)
    expect(r.duration_minutes).toBe(90)
    expect(r.pips).toBe(100)
    expect(r.profit_usd).toBe(500)
    expect(r.commission).toBe(-7)             // summed over ALL deals
    expect(r.swap).toBe(-1)                   // exits only
    expect(r.net_profit).toBe(492)
    expect(r.session).toBe('london')          // 09:00 UTC open
    expect(r.status).toBe('closed')
  })

  it('aggregates partial closes: profit summed over exits, close from the LAST exit', () => {
    const map = groupDealsByPosition([
      deal({ positionId: '7002', entryType: 'DEAL_ENTRY_IN', time: '2026-07-10T09:00:00Z', price: 2000, volume: 1 }),
      deal({ positionId: '7002', entryType: 'DEAL_ENTRY_OUT', time: '2026-07-10T09:30:00Z', price: 2005, profit: 250 }),
      deal({ positionId: '7002', entryType: 'DEAL_ENTRY_OUT', time: '2026-07-10T11:00:00Z', price: 2012, profit: 600 }),
    ])
    const { rows } = buildClosedTradeRows(map, new Map(), 'user-1')
    expect(rows[0].profit_usd).toBe(850)
    expect(rows[0].close_price).toBe(2012)
    expect(rows[0].close_time).toBe('2026-07-10T11:00:00Z')
    expect(rows[0].duration_minutes).toBe(120)
  })

  it('falls back to first-deal-entry / rest-exits when entryType is missing', () => {
    const map = groupDealsByPosition([
      deal({ positionId: '7003', time: '2026-07-10T09:00:00Z', price: 2000 }),
      deal({ positionId: '7003', time: '2026-07-10T10:00:00Z', price: 2004, profit: 200 }),
    ])
    const { rows } = buildClosedTradeRows(map, new Map(), 'user-1')
    expect(rows).toHaveLength(1)
    expect(rows[0].open_price).toBe(2000)
    expect(rows[0].close_price).toBe(2004)
  })

  it('skips positions that are still open (entry only, no exits)', () => {
    const map = groupDealsByPosition([
      deal({ positionId: '7004', entryType: 'DEAL_ENTRY_IN' }),
    ])
    const { rows } = buildClosedTradeRows(map, new Map(), 'user-1')
    expect(rows).toHaveLength(0)
  })

  it('never flips screenshot_missing back to true once a screenshot exists', () => {
    const map = groupDealsByPosition([
      deal({ positionId: '7005', entryType: 'DEAL_ENTRY_IN', time: '2026-07-10T09:00:00Z' }),
      deal({ positionId: '7005', entryType: 'DEAL_ENTRY_OUT', time: '2026-07-10T10:00:00Z', profit: 50 }),
    ])
    const shots = new Map([[7005, { hasScreenshot: true, alreadyFalse: false }]])
    const { rows, updatedTrades } = buildClosedTradeRows(map, shots, 'user-1')
    expect(rows[0].screenshot_missing).toBe(false)
    expect(updatedTrades).toBe(1)
  })
})
