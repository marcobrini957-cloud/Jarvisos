'use client'

import { useMemo, useState, useEffect } from 'react'
import MobileOverviewTab from './MobileOverviewTab'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}
import { useTrades, BE_THRESHOLD } from '@/hooks/useTrades'
import { useTasks }           from '@/hooks/useTasks'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import { usePortfolio }       from '@/hooks/usePortfolio'
import { useJournalEntries }  from '@/hooks/useJournalEntries'
import { useHabits }          from '@/hooks/useHabits'
import { useDisplayMode }     from '@/context/DisplayModeContext'
import { generateInsights }   from '@/lib/intelligence'
import { formatValue }        from '@/lib/utils/formatting'
import InsightCard            from '@/components/ui/InsightCard'
import Panel                  from '@/components/ui/Panel'
import SessionClock           from '@/components/ui/SessionClock'
import DailyMaxLoss           from '@/components/ui/DailyMaxLoss'
import PreMarketChecklist     from '@/components/ui/PreMarketChecklist'
import ConsistencyScore       from '@/components/ui/ConsistencyScore'
import GoalTracker            from '@/components/ui/GoalTracker'
import type { Trade }         from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
function fmtEur(n: number, dec = 2) {
  return `€${n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
}
function fmtPnl(n: number) {
  return `${n >= 0 ? '+' : '-'}€${Math.abs(n).toFixed(2)}`
}
function fullDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const MOOD_COLOR: Record<string, string> = {
  great: 'var(--gr2)', good: 'var(--gr2)', neutral: 'var(--am2)', low: 'var(--re)', bad: 'var(--re)',
}

// ── Market Strip ─────────────────────────────────────────────────────────────

interface StripItem { symbol: string; label: string; price: number; change1d: number; currency: string; marketState: string }

function MarketStrip() {
  const [items, setItems] = useState<StripItem[]>([])
  const [ts,    setTs]    = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/market/strip', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setItems(data.items ?? [])
          setTs(new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }))
        }
      } catch { /* silent */ }
    }
    load()
    const t = setInterval(load, 5 * 60 * 1000) // refresh every 5 min
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (items.length === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0',
      background: 'var(--s1)', border: '1px solid var(--bd)',
      borderRadius: '10px', overflow: 'hidden', height: '36px',
    }}>
      {items.map((item, i) => {
        const up    = item.change1d >= 0
        const color = item.label === 'VIX'
          ? (item.change1d > 0 ? 'var(--re)' : 'var(--gr2)') // VIX up = bad
          : (up ? 'var(--gr2)' : 'var(--re)')
        const fmtPrice = item.label === 'VIX'
          ? item.price.toFixed(2)
          : item.price >= 1000
            ? item.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
            : item.price.toFixed(2)
        return (
          <div key={item.symbol} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0 16px', height: '100%',
            borderRight: i < items.length - 1 ? '1px solid var(--bd)' : 'none',
            flexShrink: 0,
          }}>
            <span style={{ color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>{item.label}</span>
            <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.01em' }}>{fmtPrice}</span>
            <span style={{ color, fontSize: '11px', fontWeight: 600 }}>{up ? '+' : ''}{item.change1d.toFixed(2)}%</span>
            {item.marketState === 'REGULAR' && (
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', boxShadow: '0 0 5px rgba(0,232,122,0.6)', display: 'inline-block', flexShrink: 0, animation: 'pulse-dot 2s ease-in-out infinite' }} />
            )}
          </div>
        )
      })}
      {ts && (
        <div style={{ marginLeft: 'auto', padding: '0 12px', borderLeft: '1px solid var(--bd)', height: '100%', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: 'var(--t3)', fontSize: '10px' }}>↻ {ts}</span>
        </div>
      )}
    </div>
  )
}

// ── Net Worth Sparkline ───────────────────────────────────────────────────────

function NetWorthSparkline({ allRows }: { allRows: Trade[] }) {
  const points = useMemo(() => {
    const realTrades = allRows.filter(t => t.close_time && t.symbol !== 'BALANCE')
    if (realTrades.length === 0) return []

    const earliest   = realTrades.reduce((min, t) => t.close_time! < min ? t.close_time! : min, realTrades[0].close_time!)
    const startDate  = new Date(earliest)
    const now        = new Date()

    const months: { month: number; year: number; pnl: number }[] = []
    let y = startDate.getFullYear(), m = startDate.getMonth()
    while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
      const yCopy = y, mCopy = m
      const pnl = realTrades
        .filter(t => { const d = new Date(t.close_time!); return d.getFullYear() === yCopy && d.getMonth() === mCopy })
        .reduce((s, t) => s + (t.net_profit ?? 0), 0)
      months.push({ month: m, year: y, pnl })
      m++; if (m > 11) { m = 0; y++ }
    }

    let cum = 0
    return months.map(mo => { cum += mo.pnl; return { month: mo.month, year: mo.year, value: cum } })
  }, [allRows])

  if (points.length === 0) return null

  const values = points.map(p => p.value)
  const minVal = Math.min(0, ...values)
  const maxVal = Math.max(0, ...values)
  const range  = maxVal - minVal || 1
  const VW = 800, VH = 160, PAD = 8
  const GOLD = '#FFB030'

  const toY = (v: number) => PAD + (1 - (v - minVal) / range) * (VH - PAD * 2)
  const toX = (i: number) => (i / Math.max(1, points.length - 1)) * VW

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(2)},${toY(p.value).toFixed(2)}`).join(' ')
  const zeroY = toY(0)
  const fillD = `${pathD} L${VW},${zeroY} L0,${zeroY} Z`
  const endX  = toX(points.length - 1)
  const endY  = toY(values[values.length - 1])

  return (
    <div style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        height="56"
        preserveAspectRatio="none"
        style={{ display: 'block', shapeRendering: 'geometricPrecision' }}
      >
        <defs>
          <linearGradient id="goldSparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={GOLD} stopOpacity="0.45" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
          </linearGradient>
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <line x1="0" y1={zeroY} x2={VW} y2={zeroY} stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" strokeDasharray="6 4" />
        <path d={fillD} fill="url(#goldSparkGrad)" />
        <path d={pathD} fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={endX} cy={endY} r="5" fill={GOLD} filter="url(#dotGlow)" />
        <circle cx={endX} cy={endY} r="3.5" fill={GOLD} />
      </svg>
    </div>
  )
}

// ── Win Rate Ring ─────────────────────────────────────────────────────────────

function WinRing({ wr }: { wr: number }) {
  const pct   = Math.min(100, Math.max(0, wr))
  const color = pct >= 65 ? 'var(--gr2)' : pct >= 50 ? 'var(--am2)' : 'var(--re)'
  const glow  = pct >= 65 ? 'rgba(0,232,122,0.45)' : pct >= 50 ? 'rgba(240,168,64,0.45)' : 'rgba(255,61,80,0.45)'
  const deg   = (pct / 100) * 360
  return (
    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', background: `radial-gradient(circle, ${glow.replace('0.45','0.1')} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${color} ${deg}deg, var(--s3) ${deg}deg)`, boxShadow: `0 0 14px ${glow}` }} />
      <div style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontSize: '13px', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

// ── Weekly Chart ──────────────────────────────────────────────────────────────

function WeeklyChart({ weeklyPnl }: { weeklyPnl: number[] }) {
  const maxAbs = Math.max(1, ...weeklyPnl.map(Math.abs))
  const now = new Date()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
  mon.setHours(0, 0, 0, 0)
  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(d.getDate() - (6 - i) * 7)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  })
  const totalPnl = weeklyPnl.reduce((s, v) => s + v, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>Last 7 Weeks</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: totalPnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
          {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(0)}
        </span>
      </div>
      <div style={{ position: 'relative', height: '60px' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--bd2)' }} />
        <div style={{ display: 'flex', gap: '4px', height: '100%' }}>
          {weeklyPnl.map((pnl, i) => {
            const h   = Math.max(4, (Math.abs(pnl) / maxAbs) * 26)
            const pos = pnl >= 0
            const cur = i === 6
            const col = pos ? 'var(--gr2)' : 'var(--re)'
            return (
              <div key={i} title={`${labels[i]}: ${pnl >= 0 ? '+' : ''}€${pnl.toFixed(2)}`}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ height: '28px', display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  {pos && <div style={{ width: '100%', height: `${h}px`, background: col, borderRadius: '3px 3px 0 0', opacity: cur ? 1 : 0.35, boxShadow: cur ? `0 -3px 8px ${col}66` : 'none' }} />}
                </div>
                <div style={{ height: '28px', display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                  {!pos && <div style={{ width: '100%', height: `${h}px`, background: col, borderRadius: '0 0 3px 3px', opacity: cur ? 1 : 0.35, boxShadow: cur ? `0 3px 8px ${col}66` : 'none' }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {labels.map((lbl, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: '9px', color: i === 6 ? 'var(--t2)' : 'var(--t3)', fontWeight: i === 6 ? 600 : 400, whiteSpace: 'nowrap' }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Trade Calendar ────────────────────────────────────────────────────────────

function DayDetailPanel({ dateStr, trades, onClose }: {
  dateStr: string
  trades: Trade[]
  onClose: () => void
}) {
  const totalPnl = trades.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const wins     = trades.filter(t => (t.net_profit ?? 0) > BE_THRESHOLD).length
  const losses   = trades.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
  const label    = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      background: 'var(--s1)',
      border: `1px solid ${totalPnl >= 0 ? 'rgba(0,232,122,0.2)' : 'rgba(255,61,80,0.2)'}`,
      borderRadius: '12px',
      animation: 'fadeIn 0.15s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px' }}>{label}</p>
          <p style={{ fontSize: '11px', color: 'var(--t3)' }}>
            {trades.length} trade{trades.length !== 1 ? 's' : ''} · {wins}W {losses}L
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: totalPnl >= 0 ? 'var(--gr2)' : 'var(--re)', letterSpacing: '-0.03em' }}>
            {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
          </span>
          <button onClick={onClose} style={{
            background: 'var(--s3)', border: '1px solid var(--bd2)',
            borderRadius: '6px', width: '26px', height: '26px',
            color: 'var(--t3)', cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
      </div>

      {/* Trade rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {trades.map((t, i) => {
          const pnl = t.net_profit ?? 0
          const col = pnl > BE_THRESHOLD ? 'var(--gr2)' : pnl < -BE_THRESHOLD ? 'var(--re)' : 'var(--t3)'
          const openTime  = t.open_time  ? new Date(t.open_time ).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
          const closeTime = t.close_time ? new Date(t.close_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
          return (
            <div key={t.id ?? i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px',
              background: 'rgba(255,255,255,0.025)',
              borderRadius: '8px',
              border: `1px solid ${pnl > BE_THRESHOLD ? 'rgba(0,232,122,0.1)' : pnl < -BE_THRESHOLD ? 'rgba(255,61,80,0.1)' : 'var(--bd)'}`,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{t.symbol}</span>
                  {t.trade_type && (
                    <span style={{
                      fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em',
                      color: t.trade_type === 'buy' ? 'var(--gr2)' : 'var(--re)',
                      background: t.trade_type === 'buy' ? 'rgba(0,232,122,0.1)' : 'rgba(255,61,80,0.1)',
                      padding: '1px 6px', borderRadius: '4px',
                    }}>{t.trade_type.toUpperCase()}</span>
                  )}
                  {t.lot_size != null && (
                    <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{t.lot_size} lot{t.lot_size !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{openTime} → {closeTime}</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: col, letterSpacing: '-0.02em', flexShrink: 0, marginLeft: '12px' }}>
                {pnl >= 0 ? '+' : ''}€{pnl.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TradeCalendar({ allRows }: { allRows: Trade[] }) {
  const now   = new Date()
  const today = now.toISOString().split('T')[0]

  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null)
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const startOffset    = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  // Build daily map and per-day trade list for selected month
  const { dailyPnl, dailyTrades } = useMemo(() => {
    const pnlMap    = new Map<string, number>()
    const tradesMap = new Map<string, Trade[]>()
    for (const t of allRows) {
      if (!t.close_time || t.symbol === 'BALANCE') continue
      const d = new Date(t.close_time)
      if (d.getFullYear() !== viewYear || d.getMonth() !== viewMonth) continue
      const key = t.close_time.split('T')[0]
      pnlMap.set(key, (pnlMap.get(key) ?? 0) + (t.net_profit ?? 0))
      const arr = tradesMap.get(key) ?? []
      arr.push(t)
      tradesMap.set(key, arr)
    }
    return { dailyPnl: pnlMap, dailyTrades: tradesMap }
  }, [allRows, viewYear, viewMonth])

  const maxAbs     = Math.max(1, ...Array.from(dailyPnl.values()).map(Math.abs))
  const totalPnl   = Array.from(dailyPnl.values()).reduce((s, v) => s + v, 0)
  const profitDays = Array.from(dailyPnl.values()).filter(v => v > 0).length
  const lossDays   = Array.from(dailyPnl.values()).filter(v => v < 0).length

  const selectedTrades = selectedDate ? (dailyTrades.get(selectedDate) ?? []) : []

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={prevMonth} style={{
          background: 'var(--s3)', border: '1px solid var(--bd2)', borderRadius: '8px',
          width: '32px', height: '32px', color: 'var(--t2)', cursor: 'pointer', fontSize: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
        }}>‹</button>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
          {monthLabel}
        </span>
        <button onClick={nextMonth} style={{
          background: isCurrentMonth ? 'transparent' : 'var(--s3)',
          border: '1px solid var(--bd2)', borderRadius: '8px',
          width: '32px', height: '32px',
          color: isCurrentMonth ? 'var(--bd3)' : 'var(--t2)',
          cursor: isCurrentMonth ? 'default' : 'pointer', fontSize: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
        }}>›</button>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(0,232,122,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(0,232,122,0.55)' }} />
            <span style={{ fontSize: '12px', color: 'var(--t2)' }}>{profitDays} green days</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(255,61,80,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(255,61,80,0.55)' }} />
            <span style={{ fontSize: '12px', color: 'var(--t2)' }}>{lossDays} red days</span>
          </div>
        </div>
        <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.025em', color: totalPnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
          {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
        </span>
      </div>

      {/* Day headers */}
      <div className="calendar-header-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--t3)', fontWeight: 600, letterSpacing: '0.04em', paddingBottom: '4px' }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="calendar-day-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '46px', gap: '4px' }}>
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum   = i + 1
          const dateStr  = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const pnl      = dailyPnl.get(dateStr)
          const isToday  = dateStr === today
          const isFuture = dateStr > today
          const isSelected = dateStr === selectedDate
          const has      = pnl !== undefined
          const intensity = has ? Math.min(1, Math.abs(pnl!) / maxAbs) : 0

          let bg: string, txtCol: string, border: string, shadow = 'none'
          if (!has) {
            bg     = isFuture ? 'transparent' : 'rgba(255,255,255,0.02)'
            txtCol = isFuture ? 'var(--bd3)' : 'var(--t3)'
            border = 'transparent'
          } else if (pnl! >= 0) {
            bg     = `rgba(0,232,122,${0.08 + intensity * 0.28})`
            txtCol = 'var(--gr2)'
            border = `rgba(0,232,122,${0.15 + intensity * 0.2})`
            shadow = intensity > 0.3 ? `0 0 12px rgba(0,232,122,${0.15 + intensity * 0.3})` : 'none'
          } else {
            bg     = `rgba(255,61,80,${0.08 + intensity * 0.28})`
            txtCol = 'var(--re2)'
            border = `rgba(255,61,80,${0.15 + intensity * 0.2})`
            shadow = intensity > 0.3 ? `0 0 12px rgba(255,61,80,${0.15 + intensity * 0.3})` : 'none'
          }

          const absVal = Math.abs(pnl ?? 0)
          const pnlStr = absVal >= 1000 ? `${pnl! >= 0 ? '+' : '-'}€${(absVal / 1000).toFixed(1)}k`
                       : absVal >= 1    ? `${pnl! >= 0 ? '+' : '-'}€${Math.round(absVal)}`
                       : ''

          return (
            <div
              key={dayNum}
              onClick={() => {
                if (!has) return
                setSelectedDate(prev => prev === dateStr ? null : dateStr)
              }}
              style={{
                borderRadius: '7px', background: bg,
                border: isSelected
                  ? '2px solid rgba(77,143,255,0.8)'
                  : isToday
                    ? '1.5px solid rgba(77,143,255,0.6)'
                    : `1px solid ${border}`,
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(77,143,255,0.15)'
                  : isToday
                    ? '0 0 0 3px rgba(77,143,255,0.1)'
                    : shadow,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                transition: 'all 0.12s',
                cursor: has ? 'pointer' : 'default',
              }}>
              <span style={{ fontSize: '11px', fontWeight: isToday || isSelected ? 700 : 400, lineHeight: 1, color: isSelected ? 'var(--ac)' : isToday ? 'var(--ac)' : has ? txtCol : 'var(--t3)' }}>
                {dayNum}
              </span>
              {has && pnlStr && (
                <span className="calendar-pnl-label" style={{ fontSize: '10px', fontWeight: 700, color: txtCol, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {pnlStr}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selectedDate && selectedTrades.length > 0 && (
        <DayDetailPanel
          dateStr={selectedDate}
          trades={selectedTrades.sort((a, b) => (a.open_time ?? '').localeCompare(b.open_time ?? ''))}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

// ── Streak Badge ──────────────────────────────────────────────────────────────

function StreakBadge({ trades }: { trades: Trade[] }) {
  const streak = useMemo(() => {
    let wins = 0, losses = 0
    for (const t of [...trades].reverse()) {
      const pnl = t.net_profit ?? 0
      if (pnl > BE_THRESHOLD) {
        if (losses > 0) break
        wins++
      } else if (pnl < -BE_THRESHOLD) {
        if (wins > 0) break
        losses++
      }
    }
    return { wins, losses }
  }, [trades])

  if (streak.wins >= 2) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)' }}>
      <span style={{ fontSize: '14px' }}>🔥</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gr2)' }}>{streak.wins}-trade win streak</span>
    </div>
  )
  if (streak.losses >= 2) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,61,80,0.1)', border: '1px solid rgba(255,61,80,0.25)' }}>
      <span style={{ fontSize: '14px' }}>⚠️</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--re)' }}>{streak.losses} losses in a row — consider stepping back</span>
    </div>
  )
  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OverviewTab() {
  const today = new Date().toISOString().split('T')[0]
  const [dailyLimit, setDailyLimit] = useState(200)

  useEffect(() => {
    const stored = localStorage.getItem('velquor-daily-limit')
    if (stored) setDailyLimit(parseFloat(stored) || 200)
    // Listen for storage changes (e.g. if DailyMaxLoss updates it)
    const handler = () => {
      const v = localStorage.getItem('velquor-daily-limit')
      if (v) setDailyLimit(parseFloat(v) || 200)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const { trades, allRows, stats, loading: tradesLoading } = useTrades(500)
  const { tasks }       = useTasks()
  const { snapshot }    = useAccountSnapshot()
  const { holdings, totalValueEur, totalPnlEur, totalPnlPct } = usePortfolio()
  const { entries }     = useJournalEntries()
  const { habits, isCompleted, todayCompleted, todayTotal, calcStreak } = useHabits()
  const { displayMode } = useDisplayMode()
  const isMobile = useIsMobile()

  if (isMobile) return <MobileOverviewTab />

  const balance  = snapshot?.balance ?? 0
  const equity   = snapshot?.equity  ?? 0
  const netWorth = balance + totalValueEur

  const todayPnl = useMemo(() =>
    allRows.filter(t => t.close_time?.startsWith(today) && t.symbol !== 'BALANCE')
      .reduce((s, t) => s + (t.net_profit ?? 0), 0),
  [allRows, today])

  const todayLossAmt = Math.max(0, -todayPnl) // positive amount if losing today

  const monthStart  = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1), [])
  const monthTrades = useMemo(() => trades.filter(t => t.close_time && new Date(t.close_time) >= monthStart), [trades, monthStart])
  const monthWins   = monthTrades.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
  const monthLosses = monthTrades.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length

  const wins   = trades.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
  const losses = trades.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
  const wr     = stats?.winRate ?? 0

  const journalStreak = useMemo(() => {
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().split('T')[0]
      if (entries.some(e => e.entry_date === key)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return streak
  }, [entries])

  const openTasks    = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done' && t.status !== 'cancelled')
  const todayTasks   = tasks.filter(t => t.due_date === today && t.status !== 'cancelled').slice(0, 5)
  const highPriTasks = openTasks.filter(t => t.priority === 'high').slice(0, 5)
  const focusTasks   = todayTasks.length > 0 ? todayTasks : highPriTasks

  const lastEntry = useMemo(() =>
    [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0] ?? null,
  [entries])

  const insights = useMemo(() => generateInsights({
    trades: [...trades, ...allRows.filter(t => t.symbol === 'BALANCE')],
    holdings, journal: entries, tasks, accountBalance: balance, portfolioValue: totalValueEur,
  }), [trades, allRows, holdings, entries, tasks, balance, totalValueEur])

  const journaledToday = entries.some(e => e.entry_date === today)
  const monthPnl       = stats?.monthPnl ?? 0
  const monthPnlPct    = balance > 0 ? (monthPnl / balance) * 100 : 0
  const weeklyPnl      = stats?.weeklyPnl ?? Array(7).fill(0)
  const bestInstrument = (stats?.xauWinRate ?? 0) >= (stats?.nasWinRate ?? 0)
    ? { label: 'XAUUSD', wr: stats?.xauWinRate ?? 0 }
    : { label: 'NAS100', wr: stats?.nasWinRate ?? 0 }

  const bestHabitStreak = habits.length > 0 ? Math.max(...habits.map(h => calcStreak(h.id))) : 0

  const todayColor = todayPnl > 0 ? 'var(--gr2)' : todayPnl < 0 ? 'var(--re)' : 'var(--t2)'
  const monthColor = monthPnl >= 0 ? 'var(--gr2)' : 'var(--re)'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 fade-in">

      {/* Market Strip */}
      <MarketStrip />

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <div className="hero-section" style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--s1)',
        border: '1px solid var(--bd2)',
        borderRadius: '16px', padding: '22px 24px 20px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 40px rgba(0,0,0,0.8)',
      }}>
        {/* Ambient glows */}
        <div className="ambient-blue"  style={{ width: '300px', height: '300px', top: '-120px', right: '50px',  opacity: 0.4 }} />
        <div className="ambient-gold"  style={{ width: '200px', height: '200px', top: '-60px',  right: '280px', opacity: 0.25 }} />
        <div className="ambient-green" style={{ width: '160px', height: '160px', bottom: '-60px', left: '60px', opacity: 0.2 }} />

        <div style={{ position: 'relative' }}>
          {/* Row 1: date + habits + streak */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {fullDate()}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {habits.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{todayCompleted}/{todayTotal}</span>
                  {habits.map(h => {
                    const done = isCompleted(h.id, today)
                    return <div key={h.id} title={h.name} style={{ width: '8px', height: '8px', borderRadius: '50%', background: done ? 'var(--gr2)' : 'var(--s3)', border: `1px solid ${done ? 'var(--gr)' : 'var(--bd2)'}`, boxShadow: done ? '0 0 5px rgba(0,232,122,0.55)' : 'none' }} />
                  })}
                </div>
              )}
              {bestHabitStreak >= 3 && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: bestHabitStreak >= 7 ? 'var(--go2)' : 'var(--pu)', textShadow: bestHabitStreak >= 7 ? '0 0 14px rgba(255,176,48,0.4)' : 'none' }}>
                  🔥 {bestHabitStreak}d habit streak
                </span>
              )}
              {journalStreak >= 1 && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: journalStreak >= 7 ? 'var(--go2)' : 'var(--gr2)', textShadow: journalStreak >= 7 ? '0 0 14px rgba(255,176,48,0.55)' : '0 0 10px rgba(0,232,122,0.5)' }}>
                  {journalStreak >= 7 ? '🔥' : '✓'} {journalStreak}d journal
                </span>
              )}
            </div>
          </div>

          {/* Row 2: greeting + streak alert */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <h1 className="greeting-heading" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {greeting()}, Marco
            </h1>
            <StreakBadge trades={trades} />
            {overdueTasks.length > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--re)', background: 'rgba(255,61,80,0.1)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(255,61,80,0.2)' }}>
                ⚠ {overdueTasks.length} overdue
              </span>
            )}
          </div>

          {/* Row 3: Session clock */}
          <div style={{ marginBottom: '20px', padding: '10px 14px', background: 'rgba(255,255,255,0.025)', borderRadius: '10px', border: '1px solid var(--bd2)' }}>
            <SessionClock />
          </div>

          {/* Row 4: Metric grid */}
          <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', minWidth: 0 }}>

            {/* Balance */}
            <div className="metric-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.025)', borderRadius: '12px', border: '1px solid var(--bd2)', display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(9px, 1.5vw, 10px)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>MT5 Balance</span>
              <span style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtEur(balance)}</span>
              {equity > 0 && equity !== balance && <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)' }}>Equity {fmtEur(equity)}</span>}
              <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)', marginTop: '2px' }}>{wins}W / {losses}L · {stats?.totalTrades ?? 0} trades</span>
            </div>

            {/* Today P&L */}
            <div className="metric-card" style={{ padding: '16px', background: todayPnl !== 0 ? `rgba(${todayPnl > 0 ? '0,232,122' : '255,61,80'},0.07)` : 'rgba(255,255,255,0.025)', borderRadius: '12px', border: `1px solid ${todayPnl !== 0 ? (todayPnl > 0 ? 'rgba(0,232,122,0.18)' : 'rgba(255,61,80,0.18)') : 'var(--bd2)'}`, borderLeft: `3px solid ${todayColor}`, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(9px, 1.5vw, 10px)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Today P&L</span>
              <span className={todayPnl !== 0 ? (todayPnl > 0 ? 'glow-green' : 'glow-red') : ''} style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: todayColor, letterSpacing: '-0.03em', lineHeight: 1 }}>{todayPnl !== 0 ? fmtPnl(todayPnl) : '€0.00'}</span>
              <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)', marginTop: '2px' }}>{todayPnl !== 0 ? `${(balance > 0 ? todayPnl / balance * 100 : 0).toFixed(2)}% of balance` : 'No closed trades today'}</span>
            </div>

            {/* Month P&L */}
            <div className="metric-card" style={{ padding: '16px', background: `rgba(${monthPnl >= 0 ? '0,232,122' : '255,61,80'},0.06)`, borderRadius: '12px', border: `1px solid ${monthPnl >= 0 ? 'rgba(0,232,122,0.15)' : 'rgba(255,61,80,0.15)'}`, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(9px, 1.5vw, 10px)', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Month P&L</span>
              <span style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: 700, color: monthColor, letterSpacing: '-0.03em', lineHeight: 1 }}>{stats ? formatValue(monthPnl, monthPnlPct, displayMode, { showSign: true }) : '—'}</span>
              <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--t3)', marginTop: '2px' }}>{monthWins}W · {monthLosses}L this month</span>
            </div>

            {/* Win Rate */}
            <div className="metric-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.025)', borderRadius: '12px', border: '1px solid var(--bd2)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Win Rate</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <WinRing wr={wr} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)' }}>{wins}W / {losses}L</span>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>Best: {bestInstrument.label} · {bestInstrument.wr.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Net Worth */}
            <div className="metric-card" style={{ padding: '14px 16px', background: 'rgba(255,176,48,0.06)', borderRadius: '12px', border: '1px solid rgba(255,176,48,0.15)', display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, overflow: 'hidden' }}>
              {/* Left: text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Net Worth</span>
                <span className="net-worth-value" style={{ fontSize: 'clamp(14px, 2.2vw, 20px)', fontWeight: 700, color: 'var(--go2)', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmtEur(netWorth, 0)}</span>
                <span style={{ fontSize: '10px', color: 'var(--t3)' }}>MT5 + portfolio</span>
              </div>
              {/* Right: sparkline fills remaining space */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <NetWorthSparkline allRows={allRows} />
              </div>
            </div>

            {/* Weekly chart */}
            <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.025)', borderRadius: '12px', border: '1px solid var(--bd2)' }}>
              <WeeklyChart weeklyPnl={weeklyPnl} />
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CALENDAR + TODAY'S FOCUS
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2">
          <Panel title="Daily P&L Calendar" accent="var(--gr)">
            <TradeCalendar allRows={allRows} />
          </Panel>
        </div>

        <div className="lg:col-span-1">
          <Panel title="Today's Focus" accent="var(--am2)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {habits.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 600 }}>
                    Habits · {todayCompleted}/{todayTotal} done
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {habits.slice(0, 5).map(h => {
                      const done = isCompleted(h.id, today)
                      return (
                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, background: done ? 'var(--gr)' : 'transparent', border: `2px solid ${done ? 'var(--gr2)' : 'var(--bd2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: done ? '0 0 8px rgba(0,232,122,0.45)' : 'none' }}>
                            {done && <span style={{ fontSize: '9px', color: 'white', fontWeight: 700 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: '13px', color: done ? 'var(--t3)' : 'var(--t2)', textDecoration: done ? 'line-through' : 'none' }}>
                            {h.icon} {h.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {habits.length > 0 && focusTasks.length > 0 && <div style={{ height: '1px', background: 'var(--bd)' }} />}

              {focusTasks.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 600 }}>
                    {todayTasks.length > 0 ? 'Due Today' : 'High Priority'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {focusTasks.map(task => {
                      const overdue = task.due_date && task.due_date < today && task.status !== 'done'
                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, marginTop: '1px', background: task.status === 'done' ? 'var(--gr)' : 'transparent', border: `2px solid ${task.status === 'done' ? 'var(--gr2)' : overdue ? 'var(--re)' : 'var(--bd2)'}`, boxShadow: task.status === 'done' ? '0 0 6px rgba(0,232,122,0.4)' : 'none' }} />
                          <span style={{ fontSize: '13px', lineHeight: 1.45, color: task.status === 'done' ? 'var(--t3)' : overdue ? 'var(--re)' : 'var(--t2)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                            {task.title}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {openTasks.length > focusTasks.length && (
                    <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '8px' }}>+{openTasks.length - focusTasks.length} more open</p>
                  )}
                </div>
              )}

              {habits.length === 0 && focusTasks.length === 0 && (
                <p style={{ color: 'var(--t3)', fontSize: '13px' }}>Add habits and tasks to fill this panel.</p>
              )}

              {lastEntry && (
                <>
                  <div style={{ height: '1px', background: 'var(--bd)' }} />
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '7px', fontWeight: 600 }}>
                      Last Journal · {lastEntry.entry_date}
                    </p>
                    {lastEntry.mood && (
                      <p style={{ fontSize: '13px', fontWeight: 600, color: MOOD_COLOR[lastEntry.mood] ?? 'var(--t2)', marginBottom: '5px' }}>● {lastEntry.mood}</p>
                    )}
                    {lastEntry.body_text && (
                      <p style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: 1.6 }}>
                        {lastEntry.body_text.slice(0, 130)}{lastEntry.body_text.length > 130 ? '…' : ''}
                      </p>
                    )}
                    {!journaledToday && <p style={{ fontSize: '12px', color: 'var(--am2)', marginTop: '6px' }}>⚠ No entry today yet</p>}
                  </div>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TRADING TOOLS ROW (Daily Limit · Checklist · Consistency · Goal)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <Panel title="Pre-Market & Daily Risk" accent="var(--re)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <DailyMaxLoss allRows={allRows} />
            <div style={{ height: '1px', background: 'var(--bd)' }} />
            <PreMarketChecklist />
          </div>
        </Panel>

        <Panel title="Performance & Goals" accent="var(--ac)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GoalTracker monthPnl={stats?.monthPnl ?? 0} />
            <div style={{ height: '1px', background: 'var(--bd)' }} />
            <ConsistencyScore
              trades={trades}
              entries={entries}
              dailyLoss={todayLossAmt}
              dailyLimit={dailyLimit}
            />
          </div>
        </Panel>

      </div>

      {/* ══════════════════════════════════════════════════════════
          VELQUOR INTELLIGENCE
      ══════════════════════════════════════════════════════════ */}
      <Panel
        title="VELQUOR Intelligence"
        accent="var(--go2)"
        action={insights.length > 0 ? (
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,176,48,0.1)', color: 'var(--go2)', fontWeight: 600, border: '1px solid rgba(255,176,48,0.2)' }}>
            {insights.length} insight{insights.length !== 1 ? 's' : ''}
          </span>
        ) : undefined}
      >
        {insights.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {insights.slice(0, 4).map(i => <InsightCard key={i.id} insight={i} compact />)}
          </div>
        ) : (
          <p style={{ color: 'var(--t3)', fontSize: '13px' }}>
            {tradesLoading ? 'Analysing your trades…' : 'Sync MT5 and add trades to generate insights.'}
          </p>
        )}
      </Panel>

    </div>
  )
}
