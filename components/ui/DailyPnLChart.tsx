'use client'

import { useEffect, useMemo, useState } from 'react'
import { eurSigned } from '@/lib/utils/formatting'

interface Bar { date: string; pnl: number; wins: number; losses: number; breakEven?: number }

type Range = '30d' | 'mtd' | '90d'

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: '30d', label: '30D',   days: 30 },
  { key: 'mtd', label: 'Month', days: 31 },
  { key: '90d', label: '90D',   days: 90 },
]

interface Props {
  days?:      number
  height?:    number
  showStats?: boolean   // header row, range switcher and the win/loss breakdown
}

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function DailyPnLChart({ days = 30, height = 120, showStats = false }: Props) {
  const [range,   setRange]   = useState<Range>('30d')
  const [bars,    setBars]    = useState<Bar[]>([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<Bar | null>(null)

  // Fetch the widest span once per range change; "Month" is a client-side slice
  // of the same data so switching back and forth costs nothing.
  const fetchDays = showStats ? (RANGES.find(r => r.key === range)?.days ?? days) : days

  useEffect(() => {
    setLoading(true)
    fetch(`/api/trades/daily-pnl?days=${fetchDays}`)
      .then(r => r.json())
      .then(d => setBars(d.bars ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fetchDays])

  const displayBars = useMemo(() => {
    if (!showStats || range !== 'mtd') return bars
    // Calendar month to date — the window most traders actually think in, and
    // the one a broker statement is cut to.
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    return bars.filter(b => b.date >= monthStart)
  }, [bars, range, showStats])

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Loading…</span>
      </div>
    )
  }

  const rangeSwitcher = showStats && (
    <div style={{ display: 'flex', gap: '2px', background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '7px', padding: '2px' }}>
      {RANGES.map(r => (
        <button
          key={r.key}
          onClick={() => setRange(r.key)}
          style={{
            padding: '3px 9px', borderRadius: '5px', border: 'none', cursor: 'pointer',
            fontSize: '10px', fontWeight: 600,
            background: range === r.key ? 'var(--s4)' : 'transparent',
            color:      range === r.key ? 'var(--t1)' : 'var(--t3)',
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  )

  if (displayBars.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {showStats && <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{rangeSwitcher}</div>}
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--t3)', fontSize: '12px' }}>No closed trades in this period</span>
        </div>
      </div>
    )
  }

  const maxAbs = Math.max(...displayBars.map(b => Math.abs(b.pnl)), 0.01)
  const midY   = height / 2

  const total     = displayBars.reduce((s, b) => s + b.pnl, 0)
  const greenDays = displayBars.filter(b => b.pnl > 0)
  const redDays   = displayBars.filter(b => b.pnl < 0)

  // A net figure alone is unreadable: +€109.84 looks like a quiet month, when it
  // is really €449 of winners minus €339 of losses concentrated in two days.
  const wonTotal  = greenDays.reduce((s, b) => s + b.pnl, 0)
  const lostTotal = redDays.reduce((s, b) => s + b.pnl, 0)
  const best      = displayBars.reduce((a, b) => (b.pnl > a.pnl ? b : a))
  const worst     = displayBars.reduce((a, b) => (b.pnl < a.pnl ? b : a))
  const avgGreen  = greenDays.length ? wonTotal  / greenDays.length : 0
  const avgRed    = redDays.length   ? lostTotal / redDays.length   : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {showStats && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span className="num" style={{
              fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1,
              color: total >= 0 ? 'var(--gr2)' : 'var(--re)',
            }}>
              {eurSigned(total, 2)}
            </span>
            {rangeSwitcher}
          </div>

          {/* How the net is built — winners, losers, and what each side weighs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
            <span style={{ color: 'var(--gr2)' }}>{eurSigned(wonTotal)} won</span>
            <span style={{ color: 'var(--t3)' }}>·</span>
            <span style={{ color: 'var(--re)' }}>{eurSigned(lostTotal)} lost</span>
            <span style={{ color: 'var(--t3)', marginLeft: 'auto' }}>
              {displayBars.length} trading {displayBars.length === 1 ? 'day' : 'days'}
              {' · '}
              <span style={{ color: 'var(--gr2)' }}>{greenDays.length}</span>
              /
              <span style={{ color: 'var(--re)' }}>{redDays.length}</span>
            </span>
          </div>
        </>
      )}

      {/* Bars */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', height, gap: '1px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'var(--bd2)', zIndex: 0 }} />

          {displayBars.map(b => {
            const barH  = (Math.abs(b.pnl) / maxAbs) * (midY - 6)
            const isPos = b.pnl >= 0
            return (
              <div
                key={b.date}
                style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}
                onMouseEnter={() => setHovered(b)}
                onMouseLeave={() => setHovered(null)}
              >
                <div style={{
                  position: 'absolute',
                  width: '72%',
                  minHeight: '2px',
                  height: `${barH}px`,
                  background: isPos ? 'var(--gr)' : 'var(--re)',
                  opacity: hovered && hovered.date !== b.date ? 0.35 : 0.9,
                  borderRadius: isPos ? '2px 2px 0 0' : '0 0 2px 2px',
                  [isPos ? 'bottom' : 'top']: '50%',
                  transition: 'opacity 0.12s',
                }} />
              </div>
            )
          })}
        </div>

        {/* Date axis — a bar wall with no dates can't be checked against a journal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--t3)' }}>{dayLabel(displayBars[0].date)}</span>
          <span style={{ fontSize: '10px', color: 'var(--t3)' }}>{dayLabel(displayBars[displayBars.length - 1].date)}</span>
        </div>

        {hovered && (
          <div style={{
            position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)',
            pointerEvents: 'none', background: 'var(--s2)', border: '1px solid var(--bd2)',
            borderRadius: '8px', padding: '7px 12px', fontSize: '11px', color: 'var(--t1)',
            whiteSpace: 'nowrap', zIndex: 10, boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>
              {new Date(hovered.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            <div className="num" style={{ fontWeight: 600, color: hovered.pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
              {eurSigned(hovered.pnl, 2)}
            </div>
            <div style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '2px' }}>
              {hovered.wins}W · {hovered.losses}L
              {hovered.breakEven ? ` · ${hovered.breakEven} BE` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Day-size read-out */}
      {showStats && (greenDays.length > 0 || redDays.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '2px' }}>
          <ReadOut label="Avg green day" value={eurSigned(avgGreen)} color="var(--gr2)" sub={`best ${eurSigned(best.pnl)} on ${dayLabel(best.date)}`} />
          <ReadOut label="Avg red day"   value={eurSigned(avgRed)}   color="var(--re)"  sub={`worst ${eurSigned(worst.pnl)} on ${dayLabel(worst.date)}`} />
        </div>
      )}
    </div>
  )
}

function ReadOut({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div>
      <p className="label-caps" style={{ marginBottom: '3px' }}>{label}</p>
      <p className="num" style={{ fontSize: '14px', fontWeight: 600, color, lineHeight: 1.2 }}>{value}</p>
      <p style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '1px' }}>{sub}</p>
    </div>
  )
}
