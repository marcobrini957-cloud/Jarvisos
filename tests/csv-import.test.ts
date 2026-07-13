import { describe, it, expect } from 'vitest'
import { parseCSV, parseNum, detectColumns, guessAssetType } from '@/components/dashboard/tabs/portfolio/CsvImportModal'

describe('parseCSV', () => {
  it('splits on commas and semicolons, trims cells, skips blank lines', () => {
    expect(parseCSV('a,b;c\n\n d , e ')).toEqual([['a', 'b', 'c'], ['d', 'e']])
  })
  it('respects quotes around separators', () => {
    expect(parseCSV('"Apple, Inc.",AAPL')).toEqual([['Apple, Inc.', 'AAPL']])
  })
  it('handles CRLF', () => {
    expect(parseCSV('a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })
})

describe('parseNum — money parsing must handle EU and US formats', () => {
  it('US format', () => {
    expect(parseNum('1,234.56')).toBe(1234.56)
    expect(parseNum('12.5')).toBe(12.5)
  })
  it('European format', () => {
    expect(parseNum('1.234,56')).toBe(1234.56)
    expect(parseNum('482,20')).toBe(482.2)
  })
  it('comma with >2 decimals treated as thousands separator', () => {
    expect(parseNum('1,234')).toBe(1234)
  })
  it('strips currency symbols and whitespace', () => {
    expect(parseNum('€1.234,56')).toBe(1234.56)
    expect(parseNum('$ 99.90')).toBe(99.9)
  })
  it('returns NaN for empty', () => {
    expect(parseNum('')).toBeNaN()
  })
})

describe('detectColumns', () => {
  it('finds Trade Republic style German headers', () => {
    const cols = detectColumns(['ISIN', 'Bezeichnung', 'Anzahl', 'Einstandspreis'])
    expect(cols).toEqual({ ticker: 0, name: 1, qty: 2, price: 3 })
  })
  it('prefers avg-buy-price over generic price columns', () => {
    const cols = detectColumns(['Symbol', 'Name', 'Shares', 'Current Price', 'Avg Cost'])
    expect(cols.price).toBe(4)
  })
  it('falls back to generic price when no avg column exists', () => {
    const cols = detectColumns(['Ticker', 'Name', 'Quantity', 'Price'])
    expect(cols.price).toBe(3)
  })
  it('returns -1 when a column is missing', () => {
    expect(detectColumns(['foo', 'bar']).qty).toBe(-1)
  })
})

describe('guessAssetType', () => {
  it('classifies by name/ticker keywords', () => {
    expect(guessAssetType('iShares Core MSCI World', 'IWDA')).toBe('etf')
    expect(guessAssetType('Bitcoin', 'BTC-USD')).toBe('crypto')
    expect(guessAssetType('Gold 1oz', 'XAU')).toBe('metal')
    expect(guessAssetType('Apple Inc', 'AAPL')).toBe('stock')
  })
})
