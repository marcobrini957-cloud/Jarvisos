'use client'

import { useState, useMemo, useRef } from 'react'
import { useJournalEntries } from '@/hooks/useJournalEntries'
import { useTrades } from '@/hooks/useTrades'
import MetricCard from '@/components/ui/MetricCard'
import Panel from '@/components/ui/Panel'
import { Label, Num, Segmented } from '@/components/ui/vq'
import type { JournalEntry } from '@/types'
import { type Mood, MOOD_COLOR, MOOD_SCORE, MOODS, getDaysInMonth, toDateStr, isWeekday } from './journal/helpers'
import { EntryModal } from './journal/EntryModal'
import { WeeklyReviewSection } from './journal/WeeklyReviewSection'
import Icon from '@/components/ui/Icon'

// ── Main component ────────────────────────────────────────────────────────────

export default function JournalTab() {
  const { entries, loading, byDate, addEntry, deleteEntry } = useJournalEntries()
  const { trades } = useTrades(500)

  const today    = toDateStr(new Date())
  const now      = new Date()
  const [view,       setView]      = useState<'journal' | 'review'>('journal')
  const [calYear,    setCalYear]    = useState(now.getFullYear())
  const [calMonth,   setCalMonth]   = useState(now.getMonth())
  const [modal,      setModal]      = useState<{ date: string; existing?: JournalEntry } | null>(null)
  const [search,     setSearch]     = useState('')
  const [moodFilter, setMoodFilter] = useState<Mood | ''>('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Trades by date for the EntryModal auto-pull
  const tradesByDate = useMemo(() => {
    const map = new Map<string, Array<{ symbol: string; net_profit: number | null; trade_type: string }>>()
    for (const t of trades) {
      if (!t.close_time) continue
      const d = toDateStr(new Date(t.close_time))
      const arr = map.get(d) ?? []
      arr.push({ symbol: t.symbol ?? '', net_profit: t.net_profit, trade_type: t.trade_type })
      map.set(d, arr)
    }
    return map
  }, [trades])

  // Calendar days for current displayed month
  const calDays   = getDaysInMonth(calYear, calMonth)
  const firstDay  = calDays[0].getDay() // 0=Sun, adjust for Mon start
  const startPad  = (firstDay === 0 ? 6 : firstDay - 1) // blank cells before 1st

  // Trade P&L by date for mood correlation
  const pnlByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of trades) {
      if (!t.close_time) continue
      // Use local date so trades closing near midnight match the journal entry date
      const d = toDateStr(new Date(t.close_time))
      map.set(d, (map.get(d) ?? 0) + (t.net_profit ?? 0))
    }
    return map
  }, [trades])

  // Mood correlation stats
  const moodStats = useMemo(() => {
    const stats: Record<string, { totalPnl: number; count: number }> = {}
    for (const e of entries) {
      if (!e.mood) continue
      const pnl = pnlByDate.get(e.entry_date) ?? 0
      if (!stats[e.mood]) stats[e.mood] = { totalPnl: 0, count: 0 }
      stats[e.mood].totalPnl += pnl
      stats[e.mood].count++
    }
    return stats
  }, [entries, pnlByDate])

  // Streak
  const streak = useMemo(() => {
    let s = 0
    const d = new Date()
    while (true) {
      const str = toDateStr(d)
      if (byDate.has(str)) { s++; d.setDate(d.getDate() - 1) }
      else break
    }
    return s
  }, [byDate])

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      const matchMood   = !moodFilter || e.mood === moodFilter
      const matchSearch = !q
        || (e.body_text ?? '').toLowerCase().includes(q)
        || (e.tags ?? []).some(t => t.toLowerCase().includes(q))
      return matchMood && matchSearch
    })
  }, [entries, search, moodFilter])

  const isFiltered = search.trim() !== '' || moodFilter !== ''

  const avgMoodScore = entries.length > 0
    ? entries.filter(e => e.mood).reduce((s, e) => s + (MOOD_SCORE[e.mood as Mood] ?? 5), 0) / entries.filter(e => e.mood).length
    : 0

  const monthName = new Date(calYear, calMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11) } else setCalMonth(m => m-1) }
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0) } else setCalMonth(m => m+1) }

  return (
    <div className="flex flex-col gap-3">
      {/* View toggle */}
      <div className="flex items-center self-start">
        <Segmented
          options={[{ key: 'journal', label: 'Daily journal' }, { key: 'review', label: 'Weekly review' }]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === 'review' && <WeeklyReviewSection />}

      {view === 'journal' && <>
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricCard title="Entries this month" value={`${entries.filter(e => e.entry_date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).length}`} change={`of ${calDays.filter(isWeekday).length} trading days`} changePositive={null} />
        <MetricCard title="Avg mood"     value={avgMoodScore > 0 ? `${avgMoodScore.toFixed(1)}/10` : '—'} change={entries.length > 0 ? 'Based on entries' : 'No entries yet'} changePositive={null} />
        {(() => {
          const withStats = MOODS.filter(m => moodStats[m])
          if (withStats.length === 0) {
            return <MetricCard title="Best mood" value="—" change="Log moods to find your edge" changePositive={null} />
          }
          const best = withStats.sort((a, b) => (moodStats[b].totalPnl / moodStats[b].count) - (moodStats[a].totalPnl / moodStats[a].count))[0]
          const bestAvg = moodStats[best].totalPnl / moodStats[best].count
          return (
            <MetricCard
              title="Best mood"
              value={best.charAt(0).toUpperCase() + best.slice(1)}
              change={`${bestAvg >= 0 ? '+' : '−'}€${Math.abs(bestAvg).toFixed(0)}/day avg`}
              changePositive={bestAvg >= 0}
             
            />
          )
        })()}
        <MetricCard title="Streak"       value={`${streak}d`} change={streak > 0 ? 'consecutive days' : 'Start journaling today'} changePositive={null} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* LEFT: Calendar + Recent Entries */}
        <div className="lg:col-span-3 flex flex-col gap-3">

          {/* Calendar */}
          <Panel noPadding action={
            <button
              onClick={() => setModal({ date: today, existing: byDate.get(today) })}
              className="flex items-center gap-1.5 transition-colors"
              style={{
                padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)', cursor: 'pointer',
                background: byDate.has(today) ? 'transparent' : 'var(--color-ink-1)',
                border: byDate.has(today) ? '1px solid var(--color-line-1)' : 'none',
                color: byDate.has(today) ? 'var(--color-ink-2)' : 'var(--color-void)',
              }}>
              {byDate.has(today) ? 'Today logged' : '+ Log today'}
            </button>
          } title="">
            {/* Month nav */}
            <div className="flex items-center justify-between" style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-line-1)' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--color-ink-3)', cursor: 'pointer', fontSize: 'var(--text-md)' }}>‹</button>
              <Num size="sm" tone="neutral">{monthName}</Num>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--color-ink-3)', cursor: 'pointer', fontSize: 'var(--text-md)' }}>›</button>
            </div>

            {/* Day labels */}
            <div className="calendar-header-grid grid grid-cols-7 px-4 pt-3 pb-1">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} className="text-center"><Label>{d}</Label></div>
              ))}
            </div>

            {/* Day cells */}
            <div className="calendar-day-grid grid grid-cols-7 gap-1 px-4 pb-4">
              {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
              {calDays.map(day => {
                const ds      = toDateStr(day)
                const entry   = byDate.get(ds)
                const isToday = ds === today
                const future  = day > new Date()
                const weekday = isWeekday(day)
                const mood    = entry?.mood as Mood | undefined

                let bg     = 'transparent'
                let border = '1px solid transparent'
                let dot    = null

                if (entry && mood) {
                  bg     = `${MOOD_COLOR[mood]}18`
                  border = `1px solid ${MOOD_COLOR[mood]}40`
                  dot    = MOOD_COLOR[mood]
                } else if (!future && weekday) {
                  bg     = 'rgba(240,80,75,0.08)'
                  border = '1px solid rgba(240,80,75,0.18)'
                  dot    = 'var(--re)'
                }

                if (isToday) border = '1px solid var(--color-line-3)'

                return (
                  <button
                    key={ds}
                    onClick={() => !future && setModal({ date: ds, existing: entry })}
                    disabled={!!future}
                    className="relative flex flex-col items-center justify-center transition-all"
                    style={{
                      height: '38px', borderRadius: 'var(--radius-xs)', background: bg, border,
                      cursor: future ? 'default' : 'pointer',
                      opacity: future ? 0.3 : 1,
                    }}
                    onMouseEnter={e => { if (!future) e.currentTarget.style.background = 'var(--color-state-hover)' }}
                    onMouseLeave={e => { if (!future) e.currentTarget.style.background = bg }}
                  >
                    <Num size="xs" tone={isToday ? 'neutral' : 'muted'}>{day.getDate()}</Num>
                    {dot && !future && (
                      <span className="rounded-full" style={{ width: '5px', height: '5px', background: dot, display: 'block', marginTop: '2px' }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 pb-3">
              {([['var(--color-ink-1)', 'Journaled'], ['var(--color-down)', 'Missed'], ['var(--color-line-3)', 'Today']] as [string, string][]).map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="rounded-full" style={{ width: '5px', height: '5px', background: color, display: 'inline-block' }} />
                  <Label>{label}</Label>
                </div>
              ))}
            </div>
          </Panel>

          {/* Recent Entries */}
          <Panel title="Recent entries" noPadding action={
            isFiltered
              ? <Num size="xs" tone="muted">{filteredEntries.length} result{filteredEntries.length !== 1 ? 's' : ''}</Num>
              : undefined
          }>
            {/* Search + mood filter bar */}
            <div className="flex flex-col gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--bd)' }}>
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', fontSize: 'var(--text-base)', pointerEvents: 'none' }}>⌕</span>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search entries by keyword or tag…"
                  style={{
                    width: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-line-1)',
                    borderRadius: 'var(--radius-sm)', padding: '6px 30px 6px 28px',
                    color: 'var(--color-ink-1)', fontSize: 'var(--text-base)', outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-line-1)')}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 'var(--text-lg)', lineHeight: 1 }}><Icon name="close" size={13} /></button>
                )}
              </div>
              {/* Mood filter chips */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setMoodFilter('')}
                  style={{
                    padding: '2px 9px', borderRadius: 'var(--radius-xs)', fontSize: 'var(--text-xs)', cursor: 'pointer',
                    background: moodFilter === '' ? 'var(--color-surface-3)' : 'transparent',
                    border: '1px solid var(--color-line-1)',
                    color: moodFilter === '' ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                  }}>All</button>
                {MOODS.map(m => (
                  <button key={m} onClick={() => setMoodFilter(moodFilter === m ? '' : m)}
                    style={{
                      padding: '2px 9px', borderRadius: 'var(--radius-xs)', fontSize: 'var(--text-xs)', cursor: 'pointer',
                      background: moodFilter === m ? 'var(--color-surface-3)' : 'transparent',
                      border: '1px solid var(--color-line-1)',
                      color: moodFilter === m ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                      textTransform: 'capitalize',
                    }}>{m}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6"><span style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>Loading…</span></div>
            ) : entries.length === 0 ? (
              <div className="flex items-center justify-center py-6"><span style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>No entries yet — click a day on the calendar to start journaling.</span></div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <span style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>No entries match your search.</span>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                {filteredEntries.slice(0, 30).map((entry, i) => {
                  const mood    = entry.mood as Mood | undefined
                  const dayPnl  = pnlByDate.get(entry.entry_date)
                  return (
                    <div key={entry.id}
                      className="flex flex-col gap-1.5 cursor-pointer transition-colors"
                      style={{ padding: '8px 14px', borderBottom: i < Math.min(filteredEntries.length, 30) - 1 ? '1px solid var(--color-line-1)' : 'none' }}
                      onClick={() => setModal({ date: entry.entry_date, existing: entry })}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-state-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      <div className="flex items-center gap-2 flex-wrap">
                        {mood && <span className="rounded-full flex-shrink-0" style={{ width: '5px', height: '5px', display: 'inline-block', background: MOOD_COLOR[mood] }} />}
                        <Num size="xs" tone="neutral">
                          {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </Num>
                        {mood && <span style={{ color: 'var(--color-ink-3)', fontSize: 'var(--text-xs)' }}>{mood} · {MOOD_SCORE[mood]}/10</span>}
                        {entry.energy_level && <Num size="2xs" tone="muted">energy {entry.energy_level}/10</Num>}
                        {dayPnl !== undefined && (
                          <span className="vq-num" style={{ color: dayPnl >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontSize: 'var(--text-sm)', marginLeft: 'auto' }}>
                            {dayPnl >= 0 ? '+' : ''}€{Math.abs(dayPnl).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {entry.body_text && (() => {
                        const q = search.trim().toLowerCase()
                        const text = entry.body_text!
                        if (!q) return (
                          <p style={{ color: 'var(--t1)', fontSize: 'var(--text-base)', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as never }}>
                            {text}
                          </p>
                        )
                        const idx = text.toLowerCase().indexOf(q)
                        if (idx === -1) return (
                          <p style={{ color: 'var(--t1)', fontSize: 'var(--text-base)', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as never }}>
                            {text}
                          </p>
                        )
                        const start = Math.max(0, idx - 30)
                        const snippet = (start > 0 ? '…' : '') + text.slice(start, idx + q.length + 60)
                        const matchStart = idx - start + (start > 0 ? 1 : 0)
                        return (
                          <p style={{ color: 'var(--t1)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
                            {snippet.slice(0, matchStart)}
                            <mark style={{ background: 'var(--color-surface-3)', color: 'var(--color-ink-1)', borderRadius: 'var(--radius-xs)', padding: '0 2px' }}>{snippet.slice(matchStart, matchStart + q.length)}</mark>
                            {snippet.slice(matchStart + q.length)}
                          </p>
                        )
                      })()}

                      {(entry.tags ?? []).length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {(entry.tags ?? []).map(tag => (
                            <span key={tag} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', background: 'var(--color-surface-2)', padding: '1px 5px', borderRadius: 'var(--radius-xs)' }}>#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* RIGHT: Mood → P&L correlation */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Panel title="Mood → P&L correlation">
            {Object.keys(moodStats).length === 0 ? (
              <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>Add journal entries to see how your mood affects your trading P&L.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
                  Average P&L on days you journaled, grouped by mood:
                </p>

                {MOODS.filter(m => moodStats[m]).map(m => {
                  const { totalPnl, count } = moodStats[m]
                  const avg = totalPnl / count
                  const maxAbs = Math.max(1, ...MOODS.filter(x => moodStats[x]).map(x => Math.abs(moodStats[x].totalPnl / moodStats[x].count)))

                  return (
                    <div key={m}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full" style={{ width: '5px', height: '5px', background: MOOD_COLOR[m], display: 'inline-block' }} />
                          <span style={{ color: 'var(--color-ink-1)', fontSize: 'var(--text-base)', textTransform: 'capitalize' }}>{m}</span>
                          <Num size="2xs" tone="muted">{count} day{count !== 1 ? 's' : ''}</Num>
                        </div>
                        <span className="vq-num" style={{ color: avg >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontSize: 'var(--text-sm)' }}>
                          {avg >= 0 ? '+' : ''}€{Math.abs(avg).toFixed(2)} avg
                        </span>
                      </div>
                      <div className="overflow-hidden" style={{ height: '3px', background: 'var(--color-surface-2)' }}>
                        <div style={{
                          width: `${(Math.abs(avg) / maxAbs) * 100}%`,
                          height: '100%',
                          background: avg >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                        }} />
                      </div>
                    </div>
                  )
                })}

                {/* Insight */}
                {Object.keys(moodStats).length >= 2 && (() => {
                  const best  = MOODS.filter(m => moodStats[m]).sort((a, b) => (moodStats[b].totalPnl / moodStats[b].count) - (moodStats[a].totalPnl / moodStats[a].count))[0]
                  const worst = MOODS.filter(m => moodStats[m]).sort((a, b) => (moodStats[a].totalPnl / moodStats[a].count) - (moodStats[b].totalPnl / moodStats[b].count))[0]
                  const bestAvg  = moodStats[best].totalPnl  / moodStats[best].count
                  const worstAvg = moodStats[worst].totalPnl / moodStats[worst].count
                  return (
                    <div className="mt-2" style={{ padding: '9px 12px', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', background: 'var(--color-surface-1)', borderLeft: '2px solid var(--color-line-3)' }}>
                      <div style={{ marginBottom: '4px' }}><Label>Velquor insight</Label></div>
                      <p style={{ color: 'var(--color-ink-2)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
                        You trade best when feeling <strong style={{ color: 'var(--color-ink-1)' }}>{best}</strong> (avg {bestAvg >= 0 ? '+' : '−'}€{Math.abs(bestAvg).toFixed(2)}/day).
                        {best !== worst && <>
                          {' '}Avoid trading when <strong style={{ color: 'var(--color-ink-1)' }}>{worst}</strong> (avg {worstAvg >= 0 ? '+' : '−'}€{Math.abs(worstAvg).toFixed(2)}/day).
                        </>}
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}
          </Panel>

          {/* Quick stats */}
          <Panel title="This month at a glance">
            <div className="flex flex-col gap-2">
              {MOODS.map(m => {
                const count = entries.filter(e => e.mood === m && e.entry_date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).length
                if (count === 0) return null
                return (
                  <div key={m} className="flex items-center gap-2">
                    <span className="rounded-full flex-shrink-0" style={{ width: '5px', height: '5px', background: MOOD_COLOR[m], display: 'inline-block' }} />
                    <span style={{ color: 'var(--color-ink-2)', fontSize: 'var(--text-base)', textTransform: 'capitalize', flex: 1 }}>{m}</span>
                    <div className="flex gap-1">
                      {Array(count).fill(null).map((_, i) => (
                        <span key={i} className="rounded-full" style={{ width: '5px', height: '5px', background: MOOD_COLOR[m], display: 'inline-block', opacity: 0.7 }} />
                      ))}
                    </div>
                    <Num size="xs" tone="muted" style={{ minWidth: '20px', textAlign: 'right' }}>{count}d</Num>
                  </div>
                )
              })}
              {entries.filter(e => e.entry_date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).length === 0 && (
                <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>No entries this month yet.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Entry Modal */}
      {modal && (
        <EntryModal
          date={modal.date}
          existing={modal.existing}
          dayTrades={tradesByDate.get(modal.date) ?? []}
          onSave={addEntry}
          onDelete={modal.existing ? deleteEntry : undefined}
          onClose={() => setModal(null)}
        />
      )}
      </>}
    </div>
  )
}
