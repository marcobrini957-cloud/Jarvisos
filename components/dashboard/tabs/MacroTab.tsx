'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FFEvent } from '@/lib/forex-factory/calendar'

// ── Bloomberg-style economic calendar: red-folder (high-impact) releases only ──

const MONO: React.CSSProperties = {
  fontFamily: 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace',
  fontVariantNumeric: 'tabular-nums',
}

function eventDate(e: FFEvent): Date { return new Date(e.date) }

// The FF feed's display `time` string is often empty — the real timestamp is
// in `date`. Render local (Vienna) time from it.
function eventTime(e: FFEvent): string {
  const d = eventDate(e)
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })
  }
  return e.time || '—'
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'NOW'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${String(sec).padStart(2, '0')}s`
  return `${m}m ${String(sec).padStart(2, '0')}s`
}

// Beat = actual vs forecast direction (green when above, red when below).
function actualTone(e: FFEvent): string {
  if (!e.actual || !e.forecast) return 'var(--t1)'
  const a = parseFloat(e.actual.replace(/[^0-9.-]/g, ''))
  const f = parseFloat(e.forecast.replace(/[^0-9.-]/g, ''))
  if (isNaN(a) || isNaN(f) || a === f) return 'var(--t1)'
  return a > f ? 'var(--gr2)' : 'var(--re)'
}

function DayGroup({ label, events, now }: { label: string; events: FFEvent[]; now: number }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '7px 14px', background: 'rgba(255,255,255,0.03)',
        borderTop: '1px solid var(--bd2)', borderBottom: '1px solid var(--bd)',
      }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--am2)', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--t3)', ...MONO }}>{events.length} RELEASES</span>
      </div>

      {events.map((e, i) => {
        const at = eventDate(e).getTime()
        const past = at < now - 30 * 60_000
        const isNext = !past && at > now
        return (
          <div key={i} className="macro-row" style={{
            display: 'grid',
            gridTemplateColumns: '68px 20px 44px 1fr 96px 96px 96px',
            gap: '10px', alignItems: 'center',
            padding: '9px 14px',
            borderBottom: '1px solid var(--bd)',
            opacity: past ? 0.45 : 1,
            background: isNext && at - now < 3600_000 ? 'rgba(255,61,80,0.04)' : 'transparent',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t1)', ...MONO }}>{eventTime(e)}</span>
            <span title="High impact" style={{
              width: '9px', height: '9px', borderRadius: '2px', background: 'var(--re)',
              boxShadow: past ? 'none' : '0 0 6px rgba(255,61,80,0.6)',
            }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.06em', ...MONO }}>{e.currency}</span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.title}
            </span>
            {[
              { label: 'ACT', value: e.actual,   color: actualTone(e) },
              { label: 'FCT', value: e.forecast, color: 'var(--t2)' },
              { label: 'PRV', value: e.previous, color: 'var(--t3)' },
            ].map(cell => (
              <span key={cell.label} style={{ fontSize: '12px', textAlign: 'right', ...MONO, color: cell.value ? cell.color : 'var(--t3)' }}>
                <span style={{ fontSize: '8.5px', color: 'var(--t3)', marginRight: '6px', letterSpacing: '0.08em' }}>{cell.label}</span>
                {cell.value || '—'}
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function MacroTab() {
  const [calendar, setCalendar] = useState<FFEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [now,      setNow]      = useState(() => Date.now())

  useEffect(() => {
    fetch('/api/macro')
      .then(r => r.json())
      .then(d => setCalendar(d.calendar ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Terminal clock + countdowns tick every second
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const upcoming = useMemo(() =>
    calendar
      .filter(e => eventDate(e).getTime() > now)
      .sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime()),
  [calendar, now])

  const nextEvent = upcoming[0] ?? null

  const byDay = useMemo(() => {
    const groups = new Map<string, FFEvent[]>()
    const sorted = [...calendar].sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime())
    for (const e of sorted) {
      const d = eventDate(e)
      const key = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(e)
    }
    return groups
  }, [calendar])

  const todayKey = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

  const clock = (tz: string) =>
    new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz })

  return (
    <div className="flex flex-col gap-4 fade-in">

      {/* ── Terminal header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: '12px',
        padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            width: '10px', height: '10px', borderRadius: '2px', background: 'var(--re)',
            boxShadow: '0 0 8px rgba(255,61,80,0.7)',
          }} />
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '0.02em', margin: 0 }}>
              ECONOMIC CALENDAR
            </h2>
            <p style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.1em', margin: '2px 0 0' }}>
              USD · HIGH IMPACT ONLY · FOREXFACTORY FEED
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '22px', ...MONO }}>
          {[
            { label: 'VIENNA',   tz: 'Europe/Vienna' },
            { label: 'LONDON',   tz: 'Europe/London' },
            { label: 'NEW YORK', tz: 'America/New_York' },
          ].map(c => (
            <div key={c.label} style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.12em', margin: 0 }}>{c.label}</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', margin: '1px 0 0' }}>{clock(c.tz)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Next release hero ── */}
      <div style={{
        background: nextEvent ? 'linear-gradient(135deg, rgba(255,61,80,0.08), rgba(255,61,80,0.02))' : 'var(--s1)',
        border: `1px solid ${nextEvent ? 'rgba(255,61,80,0.25)' : 'var(--bd2)'}`,
        borderRadius: '12px', padding: '18px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px',
      }}>
        {nextEvent ? (
          <>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--re)', letterSpacing: '0.14em', margin: 0 }}>
                NEXT RELEASE
              </p>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.01em', margin: '4px 0 2px' }}>
                {nextEvent.title}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t2)', margin: 0, ...MONO }}>
                {nextEvent.currency} · {eventDate(nextEvent).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} {eventTime(nextEvent)}
                {nextEvent.forecast && ` · FCT ${nextEvent.forecast}`}
                {nextEvent.previous && ` · PRV ${nextEvent.previous}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--re)', letterSpacing: '0.01em', margin: 0, ...MONO }}>
                {fmtCountdown(eventDate(nextEvent).getTime() - now)}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.1em', margin: '2px 0 0' }}>UNTIL RELEASE</p>
            </div>
          </>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--t2)', margin: 0 }}>
            {loading ? 'Loading calendar…' : 'No further high-impact releases this week. Markets are clear.'}
          </p>
        )}
      </div>

      {/* ── Week table ── */}
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 14px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.1em' }}>
            THIS WEEK — RED FOLDERS
          </span>
          <span style={{ fontSize: '10px', color: 'var(--t3)', ...MONO }}>
            {calendar.length} EVENTS
          </span>
        </div>

        {loading ? (
          <p style={{ padding: '24px 14px', fontSize: '12px', color: 'var(--t3)' }}>Loading ForexFactory feed…</p>
        ) : calendar.length === 0 ? (
          <p style={{ padding: '24px 14px', fontSize: '12px', color: 'var(--t3)' }}>
            No high-impact USD events this week.
          </p>
        ) : (
          Array.from(byDay.entries()).map(([day, events]) => (
            <DayGroup key={day} label={day === todayKey ? `TODAY — ${day}` : day} events={events} now={now} />
          ))
        )}
      </div>
    </div>
  )
}
