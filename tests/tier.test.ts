import { describe, it, expect } from 'vitest'
import { PLANS, CAPABILITY_LABEL, tierCan, type Capability, type Tier } from '@/lib/api/tier'

// What the pricing page promises and what the app enforces were two separate
// declarations that had already drifted: four features advertised as Pro-only
// were served to everyone. These assert the shape of the ladder so a change to
// one tier cannot silently contradict another.

const CAPS = Object.keys(CAPABILITY_LABEL) as Capability[]
const TIERS: Tier[] = ['free', 'pro', 'ultra']

describe('tier capabilities', () => {
  it('every capability has words to describe it', () => {
    for (const c of CAPS) expect(CAPABILITY_LABEL[c]).toBeTruthy()
  })

  it('every plan answers for every capability', () => {
    for (const t of TIERS) {
      for (const c of CAPS) expect(typeof PLANS[t].can[c]).toBe('boolean')
    }
  })

  it('free is the EA path only — no cloud terminal, no copier', () => {
    expect(PLANS.free.cloudTerminals).toBe(0)
    expect(PLANS.free.can.cloudTerminal).toBe(false)
    expect(PLANS.free.copyGroups).toBe(0)
    expect(PLANS.free.can.copyTrading).toBe(false)
  })

  it('pro and ultra both get the cloud connection', () => {
    for (const t of ['pro', 'ultra'] as Tier[]) {
      expect(PLANS[t].cloudTerminals).toBeGreaterThan(0)
      expect(PLANS[t].can.cloudTerminal).toBe(true)
    }
  })

  it('the ladder only ever goes up — a higher tier never loses a capability', () => {
    for (const c of CAPS) {
      const rung = TIERS.map(t => PLANS[t].can[c])
      // once true, it must stay true
      const firstTrue = rung.indexOf(true)
      if (firstTrue !== -1) {
        expect(rung.slice(firstTrue).every(Boolean)).toBe(true)
      }
    }
  })

  it('a capability flag matches its numeric allowance', () => {
    // These two ways of saying the same thing must not disagree — the copier
    // being "included" while the group allowance is zero would advertise
    // something the API refuses.
    for (const t of TIERS) {
      expect(PLANS[t].can.copyTrading).toBe(PLANS[t].copyGroups > 0)
      expect(PLANS[t].can.cloudTerminal).toBe(PLANS[t].cloudTerminals > 0)
    }
  })

  it('limits loosen as you pay: free is capped, paid is not', () => {
    expect(PLANS.free.historyDays).toBeGreaterThan(0)
    expect(PLANS.free.journalLimit).toBeGreaterThan(0)
    for (const t of ['pro', 'ultra'] as Tier[]) {
      expect(PLANS[t].historyDays).toBeNull()
      expect(PLANS[t].journalLimit).toBeNull()
    }
  })

  it('priority support is the thing Ultra alone buys', () => {
    expect(PLANS.free.can.prioritySupport).toBe(false)
    expect(PLANS.pro.can.prioritySupport).toBe(false)
    expect(PLANS.ultra.can.prioritySupport).toBe(true)
  })

  it('tierCan agrees with the table', () => {
    expect(tierCan('free', 'analyst')).toBe(false)
    expect(tierCan('pro', 'analyst')).toBe(true)
    expect(tierCan('ultra', 'prioritySupport')).toBe(true)
  })
})
