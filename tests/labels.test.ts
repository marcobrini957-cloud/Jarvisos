import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SETUP_TYPES,
  DEFAULT_TRADE_TAGS,
  LABEL_MAX_COUNT,
  LABEL_MAX_LEN,
  normaliseLabels,
  resolveLabels,
} from '@/lib/trading/labels'

describe('resolveLabels', () => {
  it('gives the defaults to a user who has never touched the list', () => {
    expect(resolveLabels(null, DEFAULT_SETUP_TYPES)).toEqual([...DEFAULT_SETUP_TYPES])
    expect(resolveLabels(undefined, DEFAULT_TRADE_TAGS)).toEqual([...DEFAULT_TRADE_TAGS])
  })

  it('respects an empty list as a real choice, not a missing one', () => {
    // The trader who deleted every default meant it. Handing the defaults back
    // would make deletion impossible.
    expect(resolveLabels([], DEFAULT_SETUP_TYPES)).toEqual([])
  })

  it('returns the user list once they have one', () => {
    expect(resolveLabels(['Opening drive'], DEFAULT_SETUP_TYPES)).toEqual(['Opening drive'])
  })

  it('hands back a copy, so a caller cannot mutate the defaults', () => {
    const got = resolveLabels(null, DEFAULT_SETUP_TYPES)
    got.push('scribble')
    expect(DEFAULT_SETUP_TYPES).not.toContain('scribble')
  })
})

describe('normaliseLabels', () => {
  it('trims, collapses inner whitespace and drops blanks', () => {
    expect(normaliseLabels(['  Opening   drive ', '', '   '])).toEqual(['Opening drive'])
  })

  it('collapses case-insensitive duplicates, keeping the first spelling', () => {
    // Two spellings of one setup would split that setup's stats in half —
    // lib/trading/breakdowns.ts groups on this exact string.
    expect(normaliseLabels(['Order Block', 'order block', 'ORDER BLOCK']))
      .toEqual(['Order Block'])
  })

  it('caps label length', () => {
    const long = 'x'.repeat(LABEL_MAX_LEN + 20)
    expect(normaliseLabels([long])![0]).toHaveLength(LABEL_MAX_LEN)
  })

  it('caps how many labels a user may keep', () => {
    const many = Array.from({ length: LABEL_MAX_COUNT + 15 }, (_, i) => `setup ${i}`)
    expect(normaliseLabels(many)).toHaveLength(LABEL_MAX_COUNT)
  })

  it('keeps an empty array empty rather than turning it into null', () => {
    expect(normaliseLabels([])).toEqual([])
  })

  it('returns null for anything that is not an array, so the API can 400', () => {
    expect(normaliseLabels(null)).toBeNull()
    expect(normaliseLabels(undefined)).toBeNull()
    expect(normaliseLabels('Order Block')).toBeNull()
    expect(normaliseLabels({ a: 1 })).toBeNull()
  })

  it('ignores non-string entries mixed into the array', () => {
    expect(normaliseLabels(['Real', 42, null, { x: 1 }, 'Also real']))
      .toEqual(['Real', 'Also real'])
  })

  it('preserves the order the trader put them in', () => {
    expect(normaliseLabels(['C', 'A', 'B'])).toEqual(['C', 'A', 'B'])
  })
})
