import { describe, it, expect } from 'vitest'
import {
  buildCostReport, tierPrice, DEFAULT_COST_SETTINGS,
  type CostSettings, type UserUsage,
} from '@/lib/admin/costs'

const S: CostSettings = {
  ...DEFAULT_COST_SETTINGS,
  serverMonthlyEur:   40,
  hostingMonthlyEur:  20,
  databaseMonthlyEur: 20,
  domainMonthlyEur:   0,
  terminalCapacity:   4,
  aiCostPerCallEur:   0.01,
  pricePro:           16,
  priceUltra:         31,
}

function user(over: Partial<UserUsage> = {}): UserUsage {
  return {
    id: 'u1', email: 'a@b.c', tier: 'free',
    terminals: 0, aiCalls: 0, rows: 0, screenshots: 0, lastSeen: null,
    ...over,
  }
}

describe('tierPrice', () => {
  it('prices each tier', () => {
    expect(tierPrice('free', S)).toBe(0)
    expect(tierPrice('pro', S)).toBe(16)
    expect(tierPrice('ultra', S)).toBe(31)
  })
})

describe('buildCostReport — server slots', () => {
  it('charges a terminal holder its slice of the box, and nobody else', () => {
    // €40 box ÷ 4 slots = €10 a slot
    const r = buildCostReport([
      user({ id: 'a', terminals: 1 }),
      user({ id: 'b', terminals: 0 }),
    ], S)
    const a = r.users.find(u => u.id === 'a')!
    const b = r.users.find(u => u.id === 'b')!
    expect(a.serverEur).toBe(10)
    expect(b.serverEur).toBe(0)
  })

  it('charges two slots to a user holding two terminals', () => {
    const r = buildCostReport([user({ terminals: 2 })], S)
    expect(r.users[0].serverEur).toBe(20)
  })

  it('reports utilisation as the share of the box in use', () => {
    const r = buildCostReport([
      user({ id: 'a', terminals: 1 }),
      user({ id: 'b', terminals: 2 }),
    ], S)
    expect(r.totals.terminalsUsed).toBe(3)
    expect(r.totals.serverUtilisationPct).toBe(75)
  })
})

describe('buildCostReport — marginal vs allocated', () => {
  it('keeps an EA-path user at zero marginal cost', () => {
    const r = buildCostReport([user({ terminals: 0, aiCalls: 0, rows: 0 })], S)
    expect(r.users[0].marginalEur).toBe(0)
  })

  it('still allocates that user a share of the fixed bill', () => {
    const r = buildCostReport([user()], S)
    // €80 fixed, nothing attributed, one user
    expect(r.totals.fixedEur).toBe(80)
    expect(r.users[0].allocatedEur).toBe(80)
    expect(r.users[0].totalEur).toBe(80)
  })

  it('drops the per-user share as users are added — fixed cost is shared, not caused', () => {
    const one  = buildCostReport([user({ id: 'a' })], S)
    const four = buildCostReport(
      ['a', 'b', 'c', 'd'].map(id => user({ id })), S)
    expect(one.totals.costPerUserEur).toBe(80)
    expect(four.totals.costPerUserEur).toBe(20)
    expect(four.users[0].allocatedEur).toBeLessThan(one.users[0].allocatedEur)
  })

  it('never allocates below zero when attribution exceeds the fixed bill', () => {
    const r = buildCostReport([user({ terminals: 4, aiCalls: 100000 })], S)
    expect(r.totals.unattributedEur).toBe(0)
    expect(r.users[0].allocatedEur).toBe(0)
  })
})

describe('buildCostReport — AI and storage', () => {
  it('charges AI per call', () => {
    expect(buildCostReport([user({ aiCalls: 250 })], S).users[0].aiEur).toBe(2.5)
  })

  it('costs nothing while the AI provider is a free tier', () => {
    const free = { ...S, aiCostPerCallEur: 0 }
    expect(buildCostReport([user({ aiCalls: 9999 })], free).users[0].aiEur).toBe(0)
  })

  it('splits the database plan by share of stored rows', () => {
    const r = buildCostReport([
      user({ id: 'big',   rows: 90_000 }),
      user({ id: 'small', rows: 10_000 }),
    ], S)
    expect(r.users.find(u => u.id === 'big')!.storageEur).toBe(18)   // 90% of €20
    expect(r.users.find(u => u.id === 'small')!.storageEur).toBe(2)
  })

  it('does not divide by zero when nobody has stored anything', () => {
    expect(buildCostReport([user({ rows: 0 })], S).users[0].storageEur).toBe(0)
  })
})

describe('buildCostReport — revenue and margin', () => {
  it('shows a paying user against what they actually cost', () => {
    const r = buildCostReport([user({ tier: 'pro', terminals: 1 })], S)
    const u = r.users[0]
    expect(u.revenueEur).toBe(16)
    expect(u.serverEur).toBe(10)
    expect(u.marginEur).toBe(round(16 - u.totalEur))
  })

  it('reports the platform as loss-making while everyone is free', () => {
    const r = buildCostReport(['a', 'b'].map(id => user({ id })), S)
    expect(r.totals.revenueEur).toBe(0)
    expect(r.totals.marginEur).toBe(-80)
  })

  it('turns a profit once revenue clears the fixed bill', () => {
    const r = buildCostReport([
      user({ id: 'a', tier: 'ultra' }), user({ id: 'b', tier: 'ultra' }),
      user({ id: 'c', tier: 'ultra' }), user({ id: 'd', tier: 'ultra' }),
    ], S)
    expect(r.totals.revenueEur).toBe(124)
    expect(r.totals.marginEur).toBe(44)
  })

  it('sorts the costliest user first', () => {
    const r = buildCostReport([
      user({ id: 'cheap' }),
      user({ id: 'pricey', terminals: 2 }),
    ], S)
    expect(r.users[0].id).toBe('pricey')
  })

  it('handles an empty platform without dividing by zero', () => {
    const r = buildCostReport([], S)
    expect(r.totals.activeUsers).toBe(0)
    expect(Number.isFinite(r.totals.costPerUserEur)).toBe(true)
  })
})

const round = (n: number) => Math.round(n * 100) / 100
