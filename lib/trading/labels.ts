/**
 * Setup names and trade tags — the trader's vocabulary, not ours.
 *
 * These were two hardcoded arrays in the annotation modal. Eight ICT-flavoured
 * setups and eight mistake tags read as *the* list rather than *a* list, and a
 * trader who names things differently — most of them — had nowhere to put their
 * own. They are stored per user now, and every one of these can be deleted.
 *
 * What ships below is a starting point for someone with an empty journal. A
 * user whose lists are NULL has never touched them and sees these; once they
 * edit, their array is the truth. An empty array is a real answer, not a
 * missing one: a trader who cleared the list gets an empty list.
 */

export const DEFAULT_SETUP_TYPES = [
  'ICT Order Block',
  'BOS / CHoCH',
  'Fair Value Gap',
  'Liquidity Grab',
  'Support / Resistance',
  'Trend Follow',
  'Scalp',
  'Other',
] as const

export const DEFAULT_TRADE_TAGS = [
  'FOMO',
  'Revenge trade',
  'Early exit',
  'Late entry',
  'Oversize',
  'No SL',
  'News blindspot',
  'Emotional',
] as const

/** How long a single label may be, and how many a user may keep. */
export const LABEL_MAX_LEN = 40
export const LABEL_MAX_COUNT = 40

/**
 * Resolve what a user should see. `null`/`undefined` means untouched, so they
 * get the defaults; `[]` means they deleted everything, which is respected.
 */
export function resolveLabels(
  stored: string[] | null | undefined,
  fallback: readonly string[],
): string[] {
  return stored == null ? [...fallback] : stored
}

/**
 * Clean a list on its way to the database: trim, drop blanks, collapse
 * case-insensitive duplicates keeping the first spelling, cap length and count.
 *
 * Case-insensitive because "Order block" and "Order Block" are the same setup
 * to a human, and two of them would split that setup's stats in half — the
 * breakdowns in lib/trading/breakdowns.ts group on this string.
 */
export function normaliseLabels(input: unknown): string[] | null {
  if (input == null) return null
  if (!Array.isArray(input)) return null

  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const label = raw.trim().replace(/\s+/g, ' ').slice(0, LABEL_MAX_LEN)
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length >= LABEL_MAX_COUNT) break
  }
  return out
}
