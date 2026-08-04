'use client'

import { useState, useEffect } from 'react'
import { Num } from './vq'

// Official forex session hours (UTC, DST-independent)
// London: 08:00–16:30 UTC | NY: 13:30–22:00 UTC | Asian: 22:00–08:00 UTC
// Overlap (London + NY both open): 13:30–16:30 UTC
const SESSIONS = [
  { id: 'asian',   name: 'Asian',   start: 22 * 60,       end: 8 * 60,        wrapsDay: true },
  { id: 'london',  name: 'London',  start: 8 * 60,        end: 16 * 60 + 30,  wrapsDay: false },
  { id: 'overlap', name: 'Overlap', start: 13 * 60 + 30,  end: 16 * 60 + 30,  wrapsDay: false },
  { id: 'ny',      name: 'New York',start: 13 * 60 + 30,  end: 22 * 60,       wrapsDay: false },
]

function utcMins(): number {
  const n = new Date()
  return n.getUTCHours() * 60 + n.getUTCMinutes()
}

function isActive(s: typeof SESSIONS[number], mins: number): boolean {
  if (s.wrapsDay) return mins >= s.start || mins < s.end
  return mins >= s.start && mins < s.end
}

function minsUntil(target: number, current: number): number {
  if (target > current) return target - current
  return 1440 - current + target
}

function formatCountdown(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatUTCTime(): string {
  const n = new Date()
  return n.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC', hour12: false })
}

function formatLocalTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Vienna', hour12: false })
}

function Rule() {
  return <span style={{ width: '1px', height: '11px', background: 'var(--color-line-2)' }} />
}

/**
 * Session state as one line of instrument text. Each session used to have its
 * own colour (purple Asian, cyan London, gold overlap) — four hues that said
 * nothing a word does not. Open is ink-1, closed is ink-3, and the only
 * colour left in the row is none.
 */
export default function SessionClock() {
  const [, setTick] = useState(0)
  // The clock is the one thing on the dashboard that CANNOT agree between
  // server and client: the server renders the second it rendered in, the
  // browser hydrates a second or two later, and React throws a hydration
  // mismatch and re-renders the whole tree. suppressHydrationWarning was
  // sprinkled on two spans and silenced neither, because the mismatch is in
  // the <Num> inside them. Rendering the times only after mount is the actual
  // fix — there is no correct server-side value for "now".
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const mins = utcMins()
  const active = SESSIONS.filter(s => s.id !== 'overlap' && isActive(s, mins))
  const isOverlap = isActive(SESSIONS[2], mins)

  let primaryLabel: string
  if (isOverlap)                              primaryLabel = 'London / NY overlap'
  else if (active.some(s => s.id === 'london')) primaryLabel = 'London session'
  else if (active.some(s => s.id === 'ny'))     primaryLabel = 'New York session'
  else if (active.some(s => s.id === 'asian'))  primaryLabel = 'Asian session'
  else                                          primaryLabel = 'Markets closed'

  const upcoming: { label: string; mins: number }[] = []
  for (const s of SESSIONS) {
    if (s.id === 'overlap') continue
    if (isActive(s, mins)) {
      const left = s.wrapsDay
        ? (mins >= s.start ? (1440 - mins + s.end) : (s.end - mins))
        : s.end - mins
      upcoming.push({ label: `${s.name} closes`, mins: left })
    } else {
      upcoming.push({ label: `${s.name} opens`, mins: minsUntil(s.start, mins) })
    }
  }
  upcoming.sort((a, b) => a.mins - b.mins)
  const next = upcoming[0]

  const open = active.length > 0

  return (
    <div className="session-clock-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: open ? 'var(--color-ink-1)' : 'var(--color-ink-4)',
          animation: open ? 'pulse-dot 1.8s ease-in-out infinite' : 'none',
        }} />
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
          color: open ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
        }}>
          {primaryLabel}
        </span>
      </span>

      <Rule />

      {/* Second-precision strings can never match between server prerender and
          hydration, hence the suppression (React #418) */}
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Num size="xs" tone="neutral">{mounted ? formatLocalTime() : '--:--:--'}</Num>
        <Num size="xs" tone="muted">{mounted ? formatUTCTime() : '--:--:--'} UTC</Num>
      </span>

      {next && <Rule />}

      {next && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
            color: 'var(--color-ink-3)',
          }}>
            {next.label} in
          </span>
          <Num size="xs" tone="neutral" style={{ letterSpacing: '-0.01em' }}>
            <span>{mounted ? formatCountdown(next.mins) : '—'}</span>
          </Num>
        </span>
      )}
    </div>
  )
}
