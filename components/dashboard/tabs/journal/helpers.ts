// ── Types ─────────────────────────────────────────────────────────────────────

export type Mood = 'great' | 'good' | 'neutral' | 'low' | 'bad'

export const MOOD_COLOR: Record<Mood, string> = {
  great:   'var(--gr2)',
  good:    'var(--gr)',
  neutral: 'var(--am2)',
  low:     '#E27A4A',
  bad:     'var(--re)',
}
export const MOOD_SCORE: Record<Mood, number> = { great: 9, good: 7, neutral: 5, low: 3, bad: 1 }
export const MOODS: Mood[] = ['great', 'good', 'neutral', 'low', 'bad']

// ── Calendar helpers ──────────────────────────────────────────────────────────

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function toDateStr(d: Date): string {
  // Use local date (not UTC) so midnight-hour entries land on the correct day
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isWeekday(d: Date): boolean {
  const day = d.getDay()
  return day !== 0 && day !== 6
}
