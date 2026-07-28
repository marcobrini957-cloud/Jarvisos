import { describe, it, expect } from 'vitest'
import { splitFigures } from '@/lib/ui/figures'

/** Convenience: render a split back as "word|<figure>|word" for readable asserts. */
const shape = (s: string) =>
  splitFigures(s).map(r => (r.figure ? `<${r.text}>` : r.text)).join('')

describe('splitFigures', () => {
  it('keeps a bare count in the figure voice and its noun in the word voice', () => {
    expect(shape('17 trades')).toBe('<17> trades')
  })

  it('holds a signed money figure together', () => {
    expect(shape('+€120/day avg')).toBe('<+€120>/day avg')
    expect(shape('-$1,488.70')).toBe('<-$1,488.70>')
  })

  it('welds a percent to its number', () => {
    expect(shape('61% WR')).toBe('<61%> WR')
  })

  it('welds a short unit but never swallows the following word', () => {
    expect(shape('42p')).toBe('<42p>')
    expect(shape('3d streak')).toBe('<3d> streak')
    expect(shape('5 trades')).toBe('<5> trades')
  })

  it('handles several figures in one label', () => {
    expect(shape('across 42 trades · 61% WR')).toBe('across <42> trades · <61%> WR')
  })

  it('leaves a pure word label entirely alone', () => {
    expect(shape('Best mood: Neutral')).toBe('Best mood: Neutral')
    expect(splitFigures('Within limits').every(r => !r.figure)).toBe(true)
  })

  it('handles a pure figure and clock times', () => {
    expect(shape('2.41')).toBe('<2.41>')
    expect(shape('09:30 London')).toBe('<09:30> London')
  })

  it('drops empty runs so nothing renders a stray span', () => {
    expect(splitFigures('100%').length).toBe(1)
    expect(splitFigures('').length).toBe(0)
  })
})
