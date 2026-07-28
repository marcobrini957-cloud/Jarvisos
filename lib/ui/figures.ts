/**
 * Splitting a mixed label into its word runs and its figure runs.
 *
 * The design language gives words to Coolvetica and every figure to JetBrains
 * Mono. Labels like "17 trades" or "+€120/day avg" are both at once, so they
 * cannot be handed wholesale to either voice — this is what decides where the
 * boundary falls. CSS cannot do it: a stylesheet cannot see which characters in
 * a text node are digits.
 */

/**
 * A figure run: an optional sign and currency mark, a digit, then digits and
 * separators, then an optional unit that is welded to the number ("42p", "61%",
 * "3d"). A unit is at most two letters and must not run on into a word, so the
 * "trades" in "17 trades" stays in the word voice.
 */
const FIGURE_RUN = /([+\-−]?[€$£]?\d[\d.,:]*(?:%|[a-zA-Z]{1,2}(?![a-zA-Z]))?)/g

export interface Run {
  text: string
  /** true → JetBrains Mono, false → Coolvetica */
  figure: boolean
}

export function splitFigures(input: string): Run[] {
  // String.split with a single capture group interleaves: text, match, text, …
  return input
    .split(FIGURE_RUN)
    .map((text, i) => ({ text, figure: i % 2 === 1 }))
    .filter(r => r.text !== '')
}
