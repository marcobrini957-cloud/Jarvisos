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
