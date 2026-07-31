'use client'

import { useState, useMemo } from 'react'
import { Num, Label, NumText, Segmented } from '@/components/ui/vq'
import type { Trade } from '@/types'
import Icon from '@/components/ui/Icon'
import { useClassifier } from '@/context/UserProfileContext'

// ── Trade Calendar ────────────────────────────────────────────────────────────

export function DayDetailPanel({ dateStr, trades, onClose }: {
  dateStr: string
  trades: Trade[]
  onClose: () => void
}) {
  const { isWin, isLoss, tradeResult } = useClassifier()
  const totalPnl = trades.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const wins     = trades.filter(t => isWin(t)).length
  const losses   = trades.filter(t => isLoss(t)).length
  const label    = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      background: 'var(--s1)',
      border: `1px solid ${totalPnl >= 0 ? 'rgba(0,196,106,0.2)' : 'rgba(240,80,75,0.2)'}`,
      borderRadius: 'var(--radius-lg)',
      animation: 'fadeIn 0.15s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px' }}>{label}</p>
          <p className="vq-num" style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
            {trades.length} trade{trades.length !== 1 ? 's' : ''} · {wins}W {losses}L
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className="vq-num" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: totalPnl >= 0 ? 'var(--color-up)' : 'var(--color-down)', letterSpacing: '-0.03em' }}>
            {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
          </span>
          <button onClick={onClose} style={{
            background: 'var(--s3)', border: '1px solid var(--bd2)',
            borderRadius: 'var(--radius-md)', width: '26px', height: '26px',
            color: 'var(--t3)', cursor: 'pointer', fontSize: 'var(--text-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="close" size={13} /></button>
        </div>
      </div>

      {/* Trade rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {trades.map((t, i) => {
          const pnl = t.net_profit ?? 0
          // Colour follows the scratch rule, not the euro amount: a 4-pip
          // clip on 0.30 lots is the same non-event as one on 0.01.
          const r   = tradeResult(t)
          const col = r === 'win' ? 'var(--color-up)' : r === 'loss' ? 'var(--color-down)' : 'var(--color-flat)'
          const openTime  = t.open_time  ? new Date(t.open_time ).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
          const closeTime = t.close_time ? new Date(t.close_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
          return (
            <div key={t.id ?? i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px',
              background: 'rgba(255,255,255,0.025)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${r === 'win' ? 'rgba(0,196,106,0.1)' : r === 'loss' ? 'rgba(240,80,75,0.1)' : 'rgba(232,163,61,0.14)'}`,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--t1)' }}>{t.symbol}</span>
                  {t.trade_type && (
                    <span style={{
                      fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.06em',
                      color: t.trade_type === 'buy' ? 'var(--color-up)' : 'var(--color-down)',
                      background: t.trade_type === 'buy' ? 'rgba(0,196,106,0.1)' : 'rgba(240,80,75,0.1)',
                      padding: '1px 6px', borderRadius: 'var(--radius-sm)',
                    }}>{t.trade_type.toUpperCase()}</span>
                  )}
                  {t.lot_size != null && (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>{t.lot_size} lot{t.lot_size !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>{openTime} → {closeTime}</span>
              </div>
              <span className="vq-num" style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: col, letterSpacing: '-0.02em', flexShrink: 0, marginLeft: '12px' }}>
                {pnl >= 0 ? '+' : ''}€{pnl.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// €-money helper — full number with thousands separators, matching the mock.
const fmtSigned = (v: number) => `${v >= 0 ? '+' : '−'}€${Math.round(Math.abs(v)).toLocaleString('en-US')}`

export function TradeCalendar({ allRows }: { allRows: Trade[] }) {
  const { isWin, isLoss, isBreakeven } = useClassifier()
  const now       = new Date()
  const today     = now.toISOString().split('T')[0]
  const thisYear  = now.getFullYear()
  const thisMonth = now.getMonth()

  const [view,      setView]      = useState<'month' | 'year'>('month')
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
  const isCurrentYear  = viewYear === now.getFullYear()

  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate()
  // Sunday-first layout (matches the mock: Sun … Sat).
  const startOffset    = new Date(viewYear, viewMonth, 1).getDay()

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

  // The same rows folded by month, for the twelve-box year view.
  const monthly = useMemo(() => {
    const rows = Array.from({ length: 12 }, () => ({ pnl: 0, trades: 0, wins: 0, losses: 0 }))
    let traded = false
    let earliest = thisYear
    for (const t of allRows) {
      if (!t.close_time || t.symbol === 'BALANCE') continue
      const d = new Date(t.close_time)
      if (d.getFullYear() < earliest) earliest = d.getFullYear()
      if (d.getFullYear() !== viewYear) continue
      const m   = rows[d.getMonth()]
      const pnl = t.net_profit ?? 0
      m.pnl += pnl
      m.trades++
      if (isWin(t))  m.wins++
      if (isLoss(t)) m.losses++
      traded = true
    }
    return { rows, traded, earliest }
    // isWin/isLoss are bound to the user's break-even setting, so they belong
    // here — without them the year view would keep last setting's month
    // tallies while the day cells below already showed the new ones.
  }, [allRows, viewYear, thisYear, isWin, isLoss])

  const selectedTrades = selectedDate ? (dailyTrades.get(selectedDate) ?? []) : []

  const monthTotal = Array.from(dailyPnl.values()).reduce((s, v) => s + v, 0)
  const yearTotal  = monthly.rows.reduce((s, m) => s + m.pnl, 0)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  function prevYear() {
    if (viewYear <= monthly.earliest) return
    setViewYear(y => y - 1)
    setSelectedDate(null)
  }
  function nextYear() {
    if (isCurrentYear) return
    setViewYear(y => y + 1)
    setSelectedDate(null)
  }
  const atEarliestYear = viewYear <= monthly.earliest

  // Chunk the month into calendar weeks (each a 7-slot row, null = padding day).
  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const dateOf = (dayNum: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

  const isYear   = view === 'year'
  const atStart  = isYear ? atEarliestYear : false
  const atEnd    = isYear ? isCurrentYear  : isCurrentMonth
  const periodHasData = isYear ? monthly.traded : dailyPnl.size > 0
  const periodTotal   = isYear ? yearTotal : monthTotal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', containerType: 'inline-size' }}>

      {/* Period navigation + total, with the month/year switch on the right.
          Three tracks so the label stays optically centred whatever the
          switch is doing. */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center', gap: '8px', padding: '0 0 2px',
      }}>
        <span />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <button
            onClick={isYear ? prevYear : prevMonth}
            aria-label={isYear ? 'Previous year' : 'Previous month'}
            disabled={atStart}
            style={{
              background: 'transparent', border: 'none',
              color: atStart ? 'var(--bd3)' : 'var(--t1)',
              cursor: atStart ? 'default' : 'pointer',
              fontSize: 'var(--text-lg)', lineHeight: 1, padding: '4px 6px',
            }}>←</button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '128px' }}>
            {isYear
              ? <Num size="base" tone="neutral" style={{ fontWeight: 700 }}>{viewYear}</Num>
              : <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.01em' }}>{monthLabel}</span>}
            {periodHasData && (
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.01em', marginTop: '1px', color: periodTotal >= 0 ? 'var(--color-up)' : 'var(--color-down)' }}>
                {fmtSigned(periodTotal)}
              </span>
            )}
          </div>
          <button
            onClick={isYear ? nextYear : nextMonth}
            aria-label={isYear ? 'Next year' : 'Next month'}
            disabled={atEnd}
            style={{
              background: 'transparent', border: 'none',
              color: atEnd ? 'var(--bd3)' : 'var(--t1)',
              cursor: atEnd ? 'default' : 'pointer',
              fontSize: 'var(--text-lg)', lineHeight: 1, padding: '4px 6px',
            }}>→</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Segmented
            options={[{ key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }]}
            value={view}
            onChange={k => { setView(k); setSelectedDate(null) }}
            titles={{ month: 'Day by day', year: 'Every month of the year' }}
          />
        </div>
      </div>

      {isYear ? (
        <YearGrid
          year={viewYear}
          months={monthly.rows}
          todayMonth={isCurrentYear ? thisMonth : null}
          maxMonth={isCurrentYear ? thisMonth : 11}
          onPick={m => { setViewMonth(m); setView('month'); setSelectedDate(null) }}
        />
      ) : (
      <>
      {/* Day headers — Sunday first */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--t3)', fontWeight: 500, paddingBottom: '3px' }}>{d}</div>
        ))}
      </div>

      {/* Weeks — each row of days followed by its Week total bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {weeks.map((week, wi) => {
          const weekPnl = week.reduce<number>((s, dn) => s + (dn != null ? (dailyPnl.get(dateOf(dn)) ?? 0) : 0), 0)
          const weekHasData = week.some(dn => dn != null && dailyPnl.has(dateOf(dn)))

          return (
            <div key={wi}>
              {/* Row of 7 day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {week.map((dayNum, di) => {
                  if (dayNum == null) {
                    return <div key={`e${di}`} style={{ minHeight: '54px', border: '1px solid var(--color-line-1)' }} />
                  }
                  const dateStr    = dateOf(dayNum)
                  const pnl        = dailyPnl.get(dateStr)
                  const list       = dailyTrades.get(dateStr) ?? []
                  const isToday    = dateStr === today
                  const isSelected = dateStr === selectedDate
                  const has        = pnl !== undefined

                  // A day counts as decided only if something in it was
                  // decided. A day of nothing but scratches stays neutral
                  // however its euros happen to add up, and a day that nets
                  // near zero because a win cancelled a loss does not.
                  const anyDecisive = list.some(t => !isBreakeven(t))
                  const isWinDay    = has && anyDecisive && pnl! > 0
                  const isLossDay   = has && anyDecisive && pnl! < 0

                  // Per-day win rate over decisive trades (wins vs losses).
                  const decisive = list.filter(t => !isBreakeven(t))
                  const wins     = decisive.filter(t => isWin(t)).length
                  const winPct   = decisive.length > 0 ? Math.round((wins / decisive.length) * 100) : null

                  const bg = isWinDay  ? 'rgba(0,196,106,0.09)'
                           : isLossDay ? 'rgba(240,80,75,0.10)'
                           : has       ? 'rgba(232,163,61,0.10)'   // scratch day — amber, not red
                           : 'transparent'

                  return (
                    <div
                      key={dayNum}
                      onClick={() => { if (has) setSelectedDate(prev => prev === dateStr ? null : dateStr) }}
                      style={{
                        minHeight: '54px', padding: '5px 6px', background: bg,
                        border: isSelected
                          ? '1.5px solid rgba(255,255,255,0.44)'
                          : isToday
                            ? '1.5px solid rgba(255,255,255,0.28)'
                            : '1px solid var(--color-line-1)',
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
                        cursor: has ? 'pointer' : 'default', transition: 'background 0.12s',
                      }}>
                      <Num size="2xs" tone={has ? 'neutral' : 'muted'}>{dayNum}</Num>
                      {has && (
                        <>
                          {/* Signed: a red tint alone left "€175" ambiguous —
                              a losing day must read as a loss on its own. And a
                              day where nothing was decided is amber, not red:
                              −€2 of spread is not a losing day. */}
                          <Num size="xs" tone={!anyDecisive ? 'flat' : pnl! >= 0 ? 'up' : 'down'}>{fmtSigned(pnl!)}</Num>
                          {winPct != null && (
                            <Num size="2xs" tone="muted">{winPct}%</Num>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Week total bar — only for weeks that contain trading days */}
              {weekHasData && (
                <div style={{
                  marginTop: '5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 'var(--radius-md)',
                  background: weekPnl >= 0 ? 'rgba(0,196,106,0.045)' : 'rgba(240,80,75,0.05)',
                  border: `1px solid ${weekPnl >= 0 ? 'rgba(0,196,106,0.12)' : 'rgba(240,80,75,0.14)'}`,
                }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--t3)' }}>Week total</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, letterSpacing: '-0.02em', color: weekPnl >= 0 ? 'var(--color-up)' : 'var(--color-down)' }}>
                      {fmtSigned(weekPnl)}
                    </span>
                    <span style={{ fontSize: 'var(--text-base)', color: 'var(--t3)', lineHeight: 1 }}>›</span>
                  </div>
                </div>
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
      </>
      )}
    </div>
  )
}

// ── Year view ─────────────────────────────────────────────────────────────────

/**
 * Twelve boxes, one per month. Same reading as a day cell — signed money, then
 * how it was earned — so the eye doesn't have to relearn the grid when the
 * switch is flipped. The column count comes from a container query, not the
 * viewport: this calendar is two thirds of a page on Overview and half of one
 * on Trading, and the boxes have to hold "−€12,345" in both.
 */
function YearGrid({ year, months, todayMonth, maxMonth, onPick }: {
  year:   number
  months: { pnl: number; trades: number; wins: number; losses: number }[]
  /** Index of the live month, or null when looking at a year that has ended. */
  todayMonth: number | null
  /** Last month that can be opened — no point walking into an empty future. */
  maxMonth: number
  onPick: (month: number) => void
}) {
  // The bars are read against each other, so the scale is the biggest month of
  // this year in either direction.
  const peak = Math.max(...months.map(m => Math.abs(m.pnl)), 1)

  return (
    <div className="vq-year-grid">
      {months.map((m, i) => {
        const name     = new Date(year, i, 1).toLocaleDateString('en-GB', { month: 'short' })
        const has      = m.trades > 0
        const decisive = m.wins + m.losses
        // A month of nothing but scratches reads neutral, however its euros land.
        const isWin    = has && decisive > 0 && m.pnl > 0
        const isLoss   = has && decisive > 0 && m.pnl < 0
        const winPct   = decisive > 0 ? Math.round((m.wins / decisive) * 100) : null
        const isNow    = i === todayMonth
        const future   = i > maxMonth
        const openable = !future

        const bg = isWin  ? 'rgba(0,196,106,0.09)'
                 : isLoss ? 'rgba(240,80,75,0.10)'
                 : has    ? 'rgba(232,163,61,0.10)'    // scratch month — amber, not red
                 : 'transparent'

        return (
          <button
            key={i}
            type="button"
            onClick={() => { if (openable) onPick(i) }}
            disabled={!openable}
            aria-label={`${name} ${year}`}
            style={{
              minHeight: '78px', padding: '7px 9px 8px', background: bg,
              border: isNow ? '1.5px solid rgba(255,255,255,0.28)' : '1px solid var(--color-line-1)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              justifyContent: 'flex-start', gap: '3px',
              minWidth: 0, overflow: 'hidden', textAlign: 'left',
              opacity: future ? 0.4 : 1,
              cursor: openable ? 'pointer' : 'default', transition: 'background 0.12s',
            }}
          >
            <Label style={{ color: has ? 'var(--color-ink-2)' : 'var(--color-ink-3)' }}>{name}</Label>
            <Num size="md" tone={!has ? 'muted' : decisive === 0 ? 'flat' : m.pnl >= 0 ? 'up' : 'down'} style={{ fontWeight: 700 }}>
              {has ? fmtSigned(m.pnl) : '—'}
            </Num>
            <div style={{
              fontSize: 'var(--text-2xs)', color: 'var(--color-ink-3)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>
              {has
                ? <NumText>{`${m.trades} trade${m.trades !== 1 ? 's' : ''}${winPct != null ? ` · ${winPct}%` : ''}`}</NumText>
                : <span style={{ fontFamily: 'var(--font-display)' }}>No trades</span>}
            </div>
            {/* Month against the year's biggest month — the figures alone don't
                say whether €797 was a good month here or a rounding error. */}
            {has && (
              <div style={{
                marginTop: 'auto', width: '100%', height: '3px',
                background: 'var(--color-line-1)', borderRadius: 'var(--radius-xs)',
              }}>
                <div style={{
                  width: `${Math.max(4, Math.round((Math.abs(m.pnl) / peak) * 100))}%`,
                  height: '100%', borderRadius: 'var(--radius-xs)',
                  background: m.pnl >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                  opacity: 0.7,
                }} />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
