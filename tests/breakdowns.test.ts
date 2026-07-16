import { describe, it, expect } from 'vitest'
import { computeBreakdowns } from '@/lib/trading/breakdowns'
import type { Trade } from '@/types'

let seq = 0
function trade(over: Partial<Trade>): Trade {
  seq++
  return {
    id: `t${seq}`,
    mt5_ticket: String(2000 + seq),
    symbol: 'XAUUSD',
    trade_type: 'buy',
    lot_size: 0.1,
    status: 'closed',
    open_time: '2026-07-10T09:00:00Z',
    close_time: '2026-07-10T10:00:00Z',
    net_profit: 100,
    ...over,
  } as Trade
}

describe('computeBreakdowns', () => {
  it('segments by setup and excludes buckets below the min-trade floor', () => {
    const rows = [
      ...Array.from({ length: 4 }, () => trade({ setup_type: 'breakout', net_profit: 100 })),
      ...Array.from({ length: 3 }, () => trade({ setup_type: 'reversal', net_profit: -80 })),
      trade({ setup_type: 'rare', net_profit: 50 }), // only 1 → dropped (min 3)
    ]
    const b = computeBreakdowns(rows)
    const keys = b.bySetup.map(s => s.key)
    expect(keys).toContain('breakout')
    expect(keys).toContain('reversal')
    expect(keys).not.toContain('rare')
  })

  it('computes win rate excluding break-evens and orders worst PnL first', () => {
    const rows = [
      ...Array.from({ length: 3 }, () => trade({ session: 'london', net_profit: 100 })),
      trade({ session: 'london', net_profit: 5 }), // breakeven — excluded from win rate denom
      ...Array.from({ length: 3 }, () => trade({ session: 'new_york', net_profit: -100 })),
    ]
    const b = computeBreakdowns(rows)
    expect(b.bySession[0].key).toBe('new_york')       // worst PnL first
    const london = b.bySession.find(s => s.key === 'london')!
    expect(london.winRate).toBe(100)                   // 3 wins / 3 decisive (BE dropped)
    expect(london.trades).toBe(4)                      // BE still counted in trades
  })

  it('surfaces the worst and best emotion×setup combo with enough samples', () => {
    const rows = [
      ...Array.from({ length: 5 }, () => trade({ emotion_pre: 'anxious', setup_type: 'reversal', net_profit: -60 })),
      ...Array.from({ length: 5 }, () => trade({ emotion_pre: 'confident', setup_type: 'breakout', net_profit: 90 })),
    ]
    const b = computeBreakdowns(rows)
    expect(b.worstCombo?.label).toBe('anxious · reversal')
    expect(b.worstCombo?.netPnl).toBeLessThan(0)
    expect(b.bestCombo?.label).toBe('confident · breakout')
    expect(b.bestCombo?.netPnl).toBeGreaterThan(0)
  })

  it('buckets discipline score and plan adherence', () => {
    const rows = [
      ...Array.from({ length: 3 }, () => trade({ discipline_score: 9, followed_plan: true,  net_profit: 100 })),
      ...Array.from({ length: 3 }, () => trade({ discipline_score: 2, followed_plan: false, net_profit: -100 })),
    ]
    const b = computeBreakdowns(rows)
    expect(b.byDiscipline.map(s => s.key)).toEqual(expect.arrayContaining(['high (8-10)', 'low (0-4)']))
    expect(b.byPlan.find(s => s.key === 'broke plan')!.netPnl).toBeLessThan(0)
  })

  it('ignores BALANCE sentinel and open trades', () => {
    const rows = [
      trade({ symbol: 'BALANCE', lot_size: 0, setup_type: 'x', net_profit: 999 }),
      trade({ status: 'open', setup_type: 'x', net_profit: 999 }),
      ...Array.from({ length: 3 }, () => trade({ setup_type: 'real', net_profit: 20 })),
    ]
    const b = computeBreakdowns(rows)
    expect(b.bySetup.map(s => s.key)).toEqual(['real'])
  })
})
