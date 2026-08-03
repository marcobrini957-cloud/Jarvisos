'use client'

import { useEffect, useState } from 'react'

/**
 * Which FX sessions are open, right now.
 *
 * This is the identity piece. The reference we took the composition from is a
 * template — a bank could swap its logo in and nothing would look out of place.
 * A live session clock is the opposite: it only makes sense on a product for
 * people who care what time it is in London, and it is the same thing VELQUOR
 * grades your trades by (session breakdown is a real tab in the dashboard).
 *
 * Standard session windows in UTC. Factual, not decorative:
 *   Sydney 21–06 · Tokyo 00–09 · London 07–16 · New York 12–21
 *
 * Renders nothing until mounted — the server has no idea what time it is where
 * the reader is, and a mismatched first paint is a hydration error.
 */

const SESSIONS: { name: string; open: number; close: number }[] = [
  { name: 'Sydney',   open: 21, close: 6  },
  { name: 'Tokyo',    open: 0,  close: 9  },
  { name: 'London',   open: 7,  close: 16 },
  { name: 'New York', open: 12, close: 21 },
]

function openSessions(d: Date): string[] {
  const h = d.getUTCHours() + d.getUTCMinutes() / 60
  return SESSIONS.filter(s => (s.open < s.close ? h >= s.open && h < s.close : h >= s.open || h < s.close))
    .map(s => s.name)
}

export function MarketClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const iv = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(iv)
  }, [])

  // Reserve the line's height before mount so the fold does not shift under it.
  if (!now) return <div style={{ height: '17px' }} />

  const open = openSessions(now)
  const label = open.length ? `${open.join(' + ')} open` : 'Markets closed'
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
      <span style={{ position: 'relative', display: 'inline-flex', width: '6px', height: '6px', flexShrink: 0 }}>
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '999px',
          background: open.length ? 'var(--ac, #4D8FFF)' : 'rgba(255,255,255,0.30)',
        }} />
        {open.length > 0 && (
          <span className="vq-live-ping" style={{
            position: 'absolute', inset: 0, borderRadius: '999px',
            background: 'var(--ac, #4D8FFF)',
          }} />
        )}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.10em',
        color: 'rgba(255,255,255,0.46)', whiteSpace: 'nowrap',
      }}>
        {label} · {time} UTC
      </span>
    </div>
  )
}
