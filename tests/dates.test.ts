import { describe, it, expect } from 'vitest'
import { toLocalYMD, monthBounds, zonedRangeToUtc } from '@/lib/dates'

describe('toLocalYMD', () => {
  it('keeps local midnight on the same calendar day', () => {
    // The exact case that broke the reports: built at local midnight, and
    // toISOString would have rolled it back to the 30th for any UTC+X user.
    expect(toLocalYMD(new Date(2026, 6, 1))).toBe('2026-07-01')
  })

  it('keeps the last moment of a day on that day', () => {
    expect(toLocalYMD(new Date(2026, 6, 31, 23, 59, 59))).toBe('2026-07-31')
  })

  it('pads single-digit months and days', () => {
    expect(toLocalYMD(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('monthBounds', () => {
  const aug1 = new Date(2026, 7, 1, 12, 0, 0)   // 1 Aug 2026, local noon

  it('gives the whole of last month when asked on the 1st', () => {
    // Marco's report: on 1 August, "Last Month" must be 1–31 July, not 30–30.
    expect(monthBounds(aug1, -1)).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('gives the whole of the current month', () => {
    expect(monthBounds(aug1, 0)).toEqual({ from: '2026-08-01', to: '2026-08-31' })
  })

  it('handles 30-day months', () => {
    expect(monthBounds(new Date(2026, 10, 15), 0)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
  })

  it('handles February in a leap year', () => {
    expect(monthBounds(new Date(2028, 1, 10), 0)).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })

  it('handles February in a common year', () => {
    expect(monthBounds(new Date(2026, 1, 10), 0)).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('rolls back across a year boundary', () => {
    expect(monthBounds(new Date(2026, 0, 9), -1)).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })
})

describe('zonedRangeToUtc', () => {
  it('brackets a Vienna month by the instants that actually delimit it', () => {
    // Vienna is UTC+2 in July, so the month opens at 22:00 on 30 June UTC.
    const { startUtc, endUtc } = zonedRangeToUtc('2026-07-01', '2026-07-31', 'Europe/Vienna')
    expect(startUtc).toBe('2026-06-30T22:00:00.000Z')
    expect(endUtc).toBe('2026-07-31T21:59:59.999Z')
  })

  it('brackets a UTC month at the naive bounds', () => {
    const { startUtc, endUtc } = zonedRangeToUtc('2026-07-01', '2026-07-31', 'UTC')
    expect(startUtc).toBe('2026-07-01T00:00:00.000Z')
    expect(endUtc).toBe('2026-07-31T23:59:59.999Z')
  })

  it('handles a zone behind UTC', () => {
    // New York is UTC-4 in July: the day starts at 04:00 UTC.
    const { startUtc } = zonedRangeToUtc('2026-07-01', '2026-07-31', 'America/New_York')
    expect(startUtc).toBe('2026-07-01T04:00:00.000Z')
  })

  it('survives a DST boundary inside the window', () => {
    // Europe/Vienna springs forward on 29 March 2026. March opens at UTC+1 and
    // closes at UTC+2, so the two ends must not share one offset.
    const { startUtc, endUtc } = zonedRangeToUtc('2026-03-01', '2026-03-31', 'Europe/Vienna')
    expect(startUtc).toBe('2026-02-28T23:00:00.000Z')
    expect(endUtc).toBe('2026-03-31T21:59:59.999Z')
  })

  it('falls back to UTC for a zone it does not know', () => {
    const { startUtc } = zonedRangeToUtc('2026-07-01', '2026-07-31', 'Mars/Olympus_Mons')
    expect(startUtc).toBe('2026-07-01T00:00:00.000Z')
  })
})
