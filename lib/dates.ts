/**
 * Calendar dates, without the UTC shift.
 *
 * `new Date(2026, 6, 1).toISOString().split('T')[0]` is the bug this file
 * exists to stop. The Date is built at *local* midnight; `toISOString` converts
 * to UTC first. For anyone east of Greenwich that lands on the previous day, so
 * "Last Month" for a trader in Vienna asked for 30 June → 30 July instead of
 * 1 July → 31 July — both ends wrong, and the report quietly missing the last
 * day of the month while including a day that belongs to the one before.
 *
 * A calendar date is not an instant. Format it from the local parts.
 */

/** `YYYY-MM-DD` from a Date's *local* parts. Never round-trips through UTC. */
export function toLocalYMD(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** First and last calendar day of the month `offset` months from `ref`. */
export function monthBounds(ref: Date, offset = 0): { from: string; to: string } {
  const start = new Date(ref.getFullYear(), ref.getMonth() + offset, 1)
  // Day 0 of the next month is the last day of this one, and it handles
  // 28/29/30/31 without a table.
  const end   = new Date(ref.getFullYear(), ref.getMonth() + offset + 1, 0)
  return { from: toLocalYMD(start), to: toLocalYMD(end) }
}

/**
 * The UTC instants that bracket a run of calendar days *in a given timezone*.
 *
 * A monthly report for a trader in Vienna should cover their July, not UTC's:
 * a trade closed at 00:30 on 1 July local happened at 22:30 on 30 June UTC, and
 * querying on naive `Z` bounds files it under June. This converts the calendar
 * window to the instants that actually delimit it.
 *
 * Falls back to plain UTC bounds if the zone is unknown, which is the old
 * behaviour and never throws.
 */
export function zonedRangeToUtc(
  fromYMD: string,
  toYMD: string,
  timeZone: string,
): { startUtc: string; endUtc: string } {
  const start = zonedTimeToUtc(`${fromYMD}T00:00:00`, timeZone)
  const end   = zonedTimeToUtc(`${toYMD}T23:59:59.999`, timeZone)
  return { startUtc: start.toISOString(), endUtc: end.toISOString() }
}

/**
 * The instant at which the given wall-clock time occurs in `timeZone`.
 *
 * Done by measuring the zone's offset at roughly the right moment and
 * subtracting it — two passes, because the offset itself depends on the instant
 * and a DST boundary can sit between the guess and the answer.
 */
function zonedTimeToUtc(localISO: string, timeZone: string): Date {
  const naive = new Date(`${localISO}Z`)          // read the parts as if UTC
  if (Number.isNaN(naive.getTime())) return new Date(NaN)

  let guess = new Date(naive.getTime() - offsetMs(naive, timeZone))
  guess = new Date(naive.getTime() - offsetMs(guess, timeZone))
  return guess
}

/** How far ahead of UTC `timeZone` is, in ms, at the given instant. */
function offsetMs(at: Date, timeZone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    const p: Record<string, string> = {}
    for (const { type, value } of fmt.formatToParts(at)) p[type] = value
    // `hour` comes back as 24 at midnight in some ICU builds.
    const hour = p.hour === '24' ? '00' : p.hour
    const asUtc = Date.UTC(
      Number(p.year), Number(p.month) - 1, Number(p.day),
      Number(hour), Number(p.minute), Number(p.second),
    )
    // formatToParts has no milliseconds, so `asUtc` is the second-floor of the
    // wall clock. Compare against the second-floor of the instant too, or the
    // sub-second part leaks into the offset and every end-of-day bound lands a
    // second late (23:59:59.999 became 00:00:00.997 the next day).
    return asUtc - Math.floor(at.getTime() / 1000) * 1000
  } catch {
    return 0                                       // unknown zone → treat as UTC
  }
}
