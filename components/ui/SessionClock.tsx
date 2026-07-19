'use client'

import { useState, useEffect } from 'react'

// Official forex session hours (UTC, DST-independent)
// London: 08:00–16:30 UTC | NY: 13:30–22:00 UTC | Asian: 22:00–08:00 UTC
// Overlap (London + NY both open): 13:30–16:30 UTC
const SESSIONS = [
  { id: 'asian',   name: 'Asian',   color: 'var(--pu2)', start: 22 * 60,       end: 8 * 60,        wrapsDay: true },
  { id: 'london',  name: 'London',  color: 'var(--cy2)', start: 8 * 60,        end: 16 * 60 + 30,  wrapsDay: false },
  { id: 'overlap', name: 'Overlap', color: 'var(--go2)', start: 13 * 60 + 30,  end: 16 * 60 + 30,  wrapsDay: false },
  { id: 'ny',      name: 'New York',color: 'var(--ac2)', start: 13 * 60 + 30,  end: 22 * 60,       wrapsDay: false },
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
  return n.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC'
}

function formatLocalTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Vienna', hour12: false })
}

export default function SessionClock() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const mins = utcMins()
  const active = SESSIONS.filter(s => s.id !== 'overlap' && isActive(s, mins))
  const isOverlap = isActive(SESSIONS[2], mins) // overlap

  // Primary session label
  let primaryLabel: string
  let primaryColor: string
  if (isOverlap) {
    primaryLabel = 'London/NY Overlap'
    primaryColor = 'var(--go2)'
  } else if (active.some(s => s.id === 'london')) {
    primaryLabel = 'London Session'
    primaryColor = 'var(--cy2)'
  } else if (active.some(s => s.id === 'ny')) {
    primaryLabel = 'New York Session'
    primaryColor = 'var(--ac2)'
  } else if (active.some(s => s.id === 'asian')) {
    primaryLabel = 'Asian Session'
    primaryColor = 'var(--pu2)'
  } else {
    primaryLabel = 'Markets Closed'
    primaryColor = 'var(--t3)'
  }

  // Next session event
  const upcomingEvents: { label: string; mins: number; color: string }[] = []
  for (const s of SESSIONS) {
    if (s.id === 'overlap') continue
    const active = isActive(s, mins)
    if (active) {
      const minsLeft = s.wrapsDay
        ? (mins >= s.start ? (1440 - mins + s.end) : (s.end - mins))
        : s.end - mins
      upcomingEvents.push({ label: `${s.name} closes`, mins: minsLeft, color: s.color })
    } else {
      const minsLeft = minsUntil(s.start, mins)
      upcomingEvents.push({ label: `${s.name} opens`, mins: minsLeft, color: s.color })
    }
  }
  upcomingEvents.sort((a, b) => a.mins - b.mins)
  const next = upcomingEvents[0]

  const isMarketOpen = active.length > 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

      {/* Live dot + session */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className={isMarketOpen ? 'live-dot' : 'live-dot'} style={{
          background: isMarketOpen ? primaryColor : 'var(--t3)',
          boxShadow: isMarketOpen ? `0 0 0 2px ${primaryColor}22, 0 0 10px ${primaryColor}55` : 'none',
          animation: isMarketOpen ? 'pulse-dot 1.8s ease-in-out infinite' : 'none',
        }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: isMarketOpen ? primaryColor : 'var(--t3)' }}>
          {primaryLabel}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'var(--bd2)' }} />

      {/* Times — second-precision strings can never match between server
          prerender and hydration, hence the suppression (React #418) */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span suppressHydrationWarning style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
          {formatLocalTime()} CET
        </span>
        <span suppressHydrationWarning style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'monospace' }}>
          {formatUTCTime()}
        </span>
      </div>

      {/* Divider */}
      {next && <div style={{ width: '1px', height: '16px', background: 'var(--bd2)' }} />}

      {/* Next event */}
      {next && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{next.label} in</span>
          <span suppressHydrationWarning style={{
            fontSize: '12px', fontWeight: 700, color: next.color,
            background: `${next.color}15`, padding: '1px 7px', borderRadius: '4px',
            border: `1px solid ${next.color}30`, fontFamily: 'monospace',
          }}>
            {formatCountdown(next.mins)}
          </span>
        </div>
      )}
    </div>
  )
}
