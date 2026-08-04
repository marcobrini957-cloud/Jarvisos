'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FFEvent } from '@/lib/forex-factory/calendar'
import { briefFor } from '@/lib/news/eventBriefs'
import { Label, Num } from '@/components/ui/vq'

// ── Bloomberg-style economic calendar: red-folder (high-impact) releases only ──

// This tab predates the token layer and carried its own mono stack.
const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
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
  if (!e.actual || !e.forecast) return 'var(--color-ink-1)'
  const a = parseFloat(e.actual.replace(/[^0-9.-]/g, ''))
  const f = parseFloat(e.forecast.replace(/[^0-9.-]/g, ''))
  if (isNaN(a) || isNaN(f) || a === f) return 'var(--color-ink-1)'
  return a > f ? 'var(--color-up)' : 'var(--color-down)'
}

function DayGroup({ label, events, now }: { label: string; events: FFEvent[]; now: number }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '6px 14px', background: 'var(--color-surface-1)',
        borderTop: '1px solid var(--color-line-1)', borderBottom: '1px solid var(--color-line-1)',
      }}>
        <Label>{label}</Label>
        <Num size="2xs" tone="muted">{events.length} releases</Num>
      </div>

      {events.map((e, i) => {
        const at = eventDate(e).getTime()
        const past = at < now - 30 * 60_000
        const isNext = !past && at > now
        const brief = briefFor(e.title)
        return (
          <div key={i} style={{
            padding: '9px 14px',
            borderBottom: '1px solid var(--color-line-1)',
            opacity: past ? 0.45 : 1,
            background: isNext && at - now < 3600_000 ? 'rgba(240,80,75,0.04)' : 'transparent',
          }}>
            {/* The three readings live in their own group so they can drop to
                a second line on a phone. They used to be three fixed 96px grid
                columns, which with the rest made ~480px of hard minimum in a
                390px viewport — the last one was sliced off the right edge. */}
            <div className="vq-macro-row" style={{
              display: 'grid',
              gridTemplateColumns: '68px 20px 44px 1fr auto',
              gap: '10px', alignItems: 'center',
            }}>
              <Num size="sm" tone="neutral">{eventTime(e)}</Num>
              <span title="High impact" style={{
                width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-down)',
              }} />
              <Num size="xs" tone="muted">{e.currency}</Num>
              <span className="vq-macro-title" style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.title}
              </span>
              <div className="vq-macro-figures" style={{ display: 'flex', gap: '10px' }}>
                {[
                  { label: 'ACT', value: e.actual,   color: actualTone(e) },
                  { label: 'FCT', value: e.forecast, color: 'var(--color-ink-2)' },
                  { label: 'PRV', value: e.previous, color: 'var(--color-ink-3)' },
                ].map(cell => (
                  <span key={cell.label} style={{ width: '96px', fontSize: 'var(--text-sm)', textAlign: 'right', ...MONO, color: cell.value ? cell.color : 'var(--color-ink-4)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)', color: 'var(--color-ink-4)', marginRight: '6px', letterSpacing: '0.14em' }}>{cell.label}</span>
                    {cell.value || '—'}
                  </span>
                ))}
              </div>
            </div>
            {/* One-glance explainer: what it is + what a hot/miss print does */}
            <p style={{
              margin: '4px 0 0', paddingLeft: '78px',
              fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', lineHeight: 1.5,
            }}>
              {brief.what} <span style={{ color: 'var(--color-ink-2)' }}>{brief.effect}</span>
            </p>
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
    <div className="flex flex-col gap-3 fade-in">

      {/* ── Terminal header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-card)',
        padding: '10px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-down)',
          }} />
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', color: 'var(--color-ink-1)', letterSpacing: '0.01em', margin: 0 }}>
              Market news
            </h2>
            <div style={{ marginTop: '2px' }}>
              <Label>USD · high impact releases</Label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px', ...MONO }}>
          {[
            { label: 'VIENNA',   tz: 'Europe/Vienna' },
            { label: 'LONDON',   tz: 'Europe/London' },
            { label: 'NEW YORK', tz: 'America/New_York' },
          ].map(c => (
            <div key={c.label} style={{ textAlign: 'right' }}>
              <Label>{c.label}</Label>
              {/* second-precision — server/client can never agree (React #418) */}
              <p suppressHydrationWarning style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-1)', margin: '1px 0 0' }}>{clock(c.tz)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Next release hero ── */}
      <div style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-line-1)',
        borderLeft: nextEvent ? '2px solid var(--color-down)' : '1px solid var(--color-line-1)',
        borderRadius: 'var(--radius-md)', padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px',
      }}>
        {nextEvent ? (
          <>
            <div>
              <Label>Next release</Label>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', color: 'var(--color-ink-1)', margin: '4px 0 3px' }}>
                {nextEvent.title}
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', margin: 0, ...MONO }}>
                {nextEvent.currency} · {eventDate(nextEvent).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} {eventTime(nextEvent)}
                {nextEvent.forecast && ` · FCT ${nextEvent.forecast}`}
                {nextEvent.previous && ` · PRV ${nextEvent.previous}`}
              </p>
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-3)', margin: '6px 0 0', lineHeight: 1.55, maxWidth: '560px' }}>
                {briefFor(nextEvent.title).what}{' '}
                <span style={{ color: 'var(--color-ink-2)' }}>{briefFor(nextEvent.title).effect}</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-down)', margin: 0, ...MONO }}>
                {fmtCountdown(eventDate(nextEvent).getTime() - now)}
              </p>
              <div style={{ marginTop: '2px' }}><Label>Until release</Label></div>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-2)', margin: 0 }}>
            {loading ? 'Loading calendar…' : 'No further high-impact releases this week. Markets are clear.'}
          </p>
        )}
      </div>

      {/* ── Week table ── */}
      <div style={{
        background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px', borderBottom: '1px solid var(--color-line-1)',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-1)' }}>
            This week — red folders
          </span>
          <Num size="2xs" tone="muted">{calendar.length} events</Num>
        </div>

        {loading ? (
          <p style={{ padding: '18px 14px', fontSize: 'var(--text-base)', color: 'var(--color-ink-3)' }}>Loading ForexFactory feed…</p>
        ) : calendar.length === 0 ? (
          <p style={{ padding: '18px 14px', fontSize: 'var(--text-base)', color: 'var(--color-ink-3)' }}>
            No high-impact USD events this week.
          </p>
        ) : (
          Array.from(byDay.entries()).map(([day, events]) => (
            <DayGroup key={day} label={day === todayKey ? `Today — ${day}` : day} events={events} now={now} />
          ))
        )}
      </div>
    </div>
  )
}
