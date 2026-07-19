import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { generateInsights, type VelquorData } from '@/lib/intelligence'
import type { Trade } from '@/types'

// Fixed "now" mid-July so month bucketing is deterministic
const NOW = new Date('2026-07-19T12:00:00Z')
beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(NOW) })
afterAll(() => { vi.useRealTimers() })

let seq = 0
function trade(net: number, over: Partial<Trade> = {}): Trade {
  seq++
  return {
    id: `t${seq}`,
    mt5_ticket: String(1000 + seq),
    symbol: 'XAUUSD',
    trade_type: 'buy',
    lot_size: 0.1,
    status: 'closed',
    open_time: '2026-07-10T09:00:00Z',
    close_time: '2026-07-10T10:00:00Z',
    net_profit: net,
    ...over,
  } as Trade
}

function data(trades: Trade[]): VelquorData {
  return { trades, holdings: [], journal: [], tasks: [], accountBalance: 1000, portfolioValue: 0 }
}

describe('monthly health insight', () => {
  it('never calls a green month difficult — break-evens are excluded from win rate', () => {
    // Marco's real July shape: 3 wins, 0 losses, 10 scratches, net positive.
    // The old wins/all formula reported 23.1% and "Difficult month".
    const trades = [
      ...[40, 35, 34.51].map(v => trade(v)),
      ...Array.from({ length: 10 }, () => trade(0.5)),
    ]
    const monthly = generateInsights(data(trades)).find(i => /month/i.test(i.message))
    expect(monthly).toBeDefined()
    expect(monthly!.message).not.toMatch(/difficult|down/i)
    expect(monthly!.message).toMatch(/strong month/i)
    expect(monthly!.valuePct).toBe(100)
  })

  it('a losing month with mostly losses reads as down with a review nudge', () => {
    const trades = [trade(50), ...Array.from({ length: 6 }, () => trade(-60))]
    const monthly = generateInsights(data(trades)).find(i => /month/i.test(i.message))
    expect(monthly).toBeDefined()
    expect(monthly!.message).toMatch(/down €310/i)
    expect(monthly!.priority).toBe('high')
  })

  it('needs at least 3 decided trades before judging the month', () => {
    const trades = [trade(50), ...Array.from({ length: 8 }, () => trade(1))]
    const monthly = generateInsights(data(trades)).find(i => /month/i.test(i.message))
    expect(monthly).toBeUndefined()
  })
})

describe('insight sources', () => {
  it('tags every insight with a source so the Edge Report can filter to trades', () => {
    const trades = [
      ...Array.from({ length: 6 }, () => trade(50, { emotion_pre: 'confident', followed_plan: true })),
      ...Array.from({ length: 4 }, () => trade(-40, { emotion_pre: 'fomo', followed_plan: false })),
    ]
    const all = generateInsights({
      ...data(trades),
      holdings: [{
        id: 'h1', ticker: 'TQQQ 3X', name: '3x Leveraged Nasdaq', pnlPct: -45, pnlEur: -450,
        currentValueEur: 550, costBasisEur: 1000,
      } as never],
      portfolioValue: 550,
    })
    expect(all.every(i => ['trades', 'portfolio', 'journal', 'tasks'].includes(i.source))).toBe(true)
    // The leveraged-ETF warning must be tagged portfolio (it used to leak into the Edge Report)
    const lev = all.find(i => /leveraged/i.test(i.message))
    expect(lev).toBeDefined()
    expect(lev!.source).toBe('portfolio')
  })
})
