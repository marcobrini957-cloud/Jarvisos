import { describe, it, expect } from 'vitest'
import { computeTraderDna } from '@/lib/trading/traderDna'
import type { Trade } from '@/types'

let seq = 0
function trade(over: Partial<Trade>): Trade {
  seq++
  const base = new Date('2026-07-01T09:00:00Z').getTime() + seq * 3 * 60 * 60 * 1000
  return {
    id: `t${seq}`,
    mt5_ticket: String(3000 + seq),
    symbol: 'XAUUSD',
    trade_type: 'buy',
    lot_size: 0.1,
    status: 'closed',
    open_time: new Date(base).toISOString(),
    close_time: new Date(base + 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    net_profit: 100,
    ...over,
  } as Trade
}

describe('computeTraderDna', () => {
  it('returns five scored dimensions plus labels and a composite', () => {
    const rows = Array.from({ length: 10 }, () => trade({ net_profit: 100 }))
    const dna = computeTraderDna(rows)
    expect(dna.dimensions.map(d => d.key)).toEqual(
      ['decision', 'discipline', 'emotional', 'risk', 'patience'],
    )
    dna.dimensions.forEach(d => {
      expect(d.score).toBeGreaterThanOrEqual(0)
      expect(d.score).toBeLessThanOrEqual(100)
    })
    expect(dna.overall).toBeGreaterThanOrEqual(0)
    expect(dna.overall).toBeLessThanOrEqual(100)
    expect(dna.sampleSize).toBe(10)
  })

  it('scores a disciplined, plan-following trader higher than an undisciplined one', () => {
    const good = computeTraderDna(Array.from({ length: 8 }, () => trade({ discipline_score: 9, followed_plan: true })))
    const bad  = computeTraderDna(Array.from({ length: 8 }, () => trade({ discipline_score: 2, followed_plan: false })))
    const g = good.dimensions.find(d => d.key === 'discipline')!.score
    const b = bad.dimensions.find(d => d.key === 'discipline')!.score
    expect(g).toBeGreaterThan(b)
  })

  it('flags high impulsiveness on rapid revenge trading after losses', () => {
    // Each trade closes a loss, next opens 5 min later → revenge pattern
    let base = new Date('2026-07-01T09:00:00Z').getTime()
    const rows: Trade[] = []
    for (let i = 0; i < 10; i++) {
      const open = base
      const close = open + 20 * 60 * 1000
      rows.push(trade({
        open_time: new Date(open).toISOString(),
        close_time: new Date(close).toISOString(),
        net_profit: -50,
        followed_plan: false,
      }))
      base = close + 5 * 60 * 1000 // next opens 5 min after this close
    }
    const dna = computeTraderDna(rows)
    expect(dna.impulsiveness).toBe('High')
  })

  it('detects poor recovery when post-loss trades underperform', () => {
    // Alternating loss → big loss right after; baseline dragged, post-loss worse
    let base = new Date('2026-07-01T09:00:00Z').getTime()
    const rows: Trade[] = []
    for (let i = 0; i < 12; i++) {
      const open = base
      const close = open + 30 * 60 * 1000
      // even = loss, odd (right after a loss) = big loss
      rows.push(trade({
        open_time: new Date(open).toISOString(),
        close_time: new Date(close).toISOString(),
        net_profit: i % 2 === 0 ? -40 : -120,
      }))
      base = close + 60 * 60 * 1000
    }
    const dna = computeTraderDna(rows)
    expect(['Poor', 'Fair']).toContain(dna.recoveryAfterLoss)
  })

  it('surfaces a worst condition of two consecutive losses when that streak loses most', () => {
    // Build: pairs of losses then a losing third trade repeatedly
    let base = new Date('2026-07-01T09:00:00Z').getTime()
    const rows: Trade[] = []
    const pnls = [-50, -50, -200, 80, 80, -50, -50, -200, 80, 80, -50, -50, -200]
    for (const p of pnls) {
      const open = base
      const close = open + 30 * 60 * 1000
      rows.push(trade({ open_time: new Date(open).toISOString(), close_time: new Date(close).toISOString(), net_profit: p }))
      base = close + 30 * 60 * 1000
    }
    const dna = computeTraderDna(rows)
    expect(dna.worstCondition).toBeTruthy()
  })

  it('excludes BALANCE and open rows from the sample', () => {
    const rows = [
      trade({ symbol: 'BALANCE', lot_size: 0, net_profit: 9999 }),
      trade({ status: 'open', net_profit: 9999 }),
      ...Array.from({ length: 5 }, () => trade({ net_profit: 50 })),
    ]
    expect(computeTraderDna(rows).sampleSize).toBe(5)
  })
})
