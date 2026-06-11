'use client'

import { useState, useMemo, useRef } from 'react'
import { useJournalEntries } from '@/hooks/useJournalEntries'
import { useTrades } from '@/hooks/useTrades'
import MetricCard from '@/components/ui/MetricCard'
import Panel from '@/components/ui/Panel'
import type { JournalEntry } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Mood = 'great' | 'good' | 'neutral' | 'low' | 'bad'

const MOOD_COLOR: Record<Mood, string> = {
  great:   'var(--gr2)',
  good:    'var(--gr)',
  neutral: 'var(--am2)',
  low:     '#E27A4A',
  bad:     'var(--re)',
}
const MOOD_SCORE: Record<Mood, number> = { great: 9, good: 7, neutral: 5, low: 3, bad: 1 }
const MOODS: Mood[] = ['great', 'good', 'neutral', 'low', 'bad']

// ── Calendar helpers ──────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function isWeekday(d: Date): boolean {
  const day = d.getDay()
  return day !== 0 && day !== 6
}

// ── Add / Edit Entry Modal ────────────────────────────────────────────────────

function EntryModal({
  date,
  existing,
  onSave,
  onDelete,
  onClose,
}: {
  date: string
  existing?: JournalEntry
  onSave: (data: Parameters<ReturnType<typeof useJournalEntries>['addEntry']>[0]) => Promise<unknown>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [mood, setMood]         = useState<Mood>((existing?.mood as Mood) ?? 'neutral')
  const [energy, setEnergy]     = useState(existing?.energy_level ?? 7)
  const [body, setBody]         = useState(existing?.body_text ?? '')
  const [trading, setTrading]   = useState(existing?.is_trading_day ?? true)
  const [tagInput, setTagInput] = useState((existing?.tags ?? []).join(', '))
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  async function handleSave() {
    setSaving(true)
    await onSave({
      entry_date:     date,
      mood,
      energy_level:   energy,
      body_text:      body,
      is_trading_day: trading,
      tags:           tagInput.split(',').map(t => t.trim()).filter(Boolean),
    })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed z-50 rounded-xl flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '520px', maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '24px', overflowY: 'auto',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 500 }}>Journal Entry</h2>
            <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '2px' }}>{displayDate}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Mood selector */}
        <div>
          <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>How are you feeling?</p>
          <div className="flex gap-2">
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m)}
                className="flex-1 py-2 rounded-md capitalize transition-all"
                style={{
                  fontSize: '12px', border: `1.5px solid ${mood === m ? MOOD_COLOR[m] : 'var(--bd2)'}`,
                  background: mood === m ? `${MOOD_COLOR[m]}18` : 'var(--s2)',
                  color: mood === m ? MOOD_COLOR[m] : 'var(--t2)', cursor: 'pointer', fontWeight: mood === m ? 500 : 400,
                }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Energy level */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Energy Level</p>
            <span style={{ color: 'var(--go2)', fontSize: '14px', fontWeight: 500 }}>{energy}/10</span>
          </div>
          <input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(Number(e.target.value))}
            className="w-full" style={{ accentColor: 'var(--ac)' }} />
          <div className="flex justify-between mt-1">
            <span style={{ color: 'var(--t3)', fontSize: '10px' }}>Exhausted</span>
            <span style={{ color: 'var(--t3)', fontSize: '10px' }}>Peak</span>
          </div>
        </div>

        {/* Text body */}
        <div>
          <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
            Journal Entry <span style={{ color: 'var(--t3)' }}>— how was your trading day? What did you feel?</span>
          </p>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            placeholder="Write freely — your setups, emotions, lessons learned, what you'd do differently…"
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '8px',
              padding: '12px', color: 'var(--t1)', fontSize: '13px', lineHeight: '1.7',
              resize: 'vertical', outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
          />
        </div>

        {/* Tags + trading day */}
        <div className="flex gap-3">
          <div className="flex-1">
            <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Tags (comma separated)</p>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              placeholder="focused, disciplined, fomo…"
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '8px',
                padding: '10px 12px', color: 'var(--t1)', fontSize: '13px', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Trading day?</p>
            <button onClick={() => setTrading(t => !t)}
              className="px-4 py-2.5 rounded-md"
              style={{
                background: trading ? 'rgba(99,153,34,0.15)' : 'var(--s2)',
                border: `1.5px solid ${trading ? 'rgba(99,153,34,0.35)' : 'var(--bd2)'}`,
                color: trading ? 'var(--gr2)' : 'var(--t3)', fontSize: '12px', cursor: 'pointer',
              }}>
              {trading ? 'Yes ✓' : 'No'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {existing && onDelete && (
            confirmDelete ? (
              <>
                <button
                  onClick={async () => {
                    setDeleting(true)
                    await onDelete(existing.id)
                    onClose()
                  }}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-md font-medium"
                  style={{ background: 'var(--re)', border: 'none', color: 'white', fontSize: '13px', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="py-2.5 px-4 rounded-md"
                  style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="py-2.5 px-3 rounded-md"
                style={{ background: 'transparent', border: '1px solid rgba(255,51,71,0.25)', color: 'var(--re)', fontSize: '13px', cursor: 'pointer' }}>
                Delete
              </button>
            )
          )}
          {!confirmDelete && (
            <>
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-md"
                style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-md font-medium"
                style={{ background: saving ? 'rgba(99,153,34,0.3)' : 'var(--gr)', border: 'none', color: 'white', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : existing ? 'Update Entry' : '+ Save Entry'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JournalTab() {
  const { entries, loading, byDate, addEntry, deleteEntry } = useJournalEntries()
  const { trades } = useTrades(500)

  const today    = toDateStr(new Date())
  const now      = new Date()
  const [calYear,    setCalYear]    = useState(now.getFullYear())
  const [calMonth,   setCalMonth]   = useState(now.getMonth())
  const [modal,      setModal]      = useState<{ date: string; existing?: JournalEntry } | null>(null)
  const [search,     setSearch]     = useState('')
  const [moodFilter, setMoodFilter] = useState<Mood | ''>('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Calendar days for current displayed month
  const calDays   = getDaysInMonth(calYear, calMonth)
  const firstDay  = calDays[0].getDay() // 0=Sun, adjust for Mon start
  const startPad  = (firstDay === 0 ? 6 : firstDay - 1) // blank cells before 1st

  // Trade P&L by date for mood correlation
  const pnlByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of trades) {
      if (!t.close_time) continue
      const d = t.close_time.split('T')[0]
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
    <div className="flex flex-col gap-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Entries This Month" value={`${entries.filter(e => e.entry_date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).length}`} change={`of ${calDays.filter(isWeekday).length} trading days`} changePositive={null} barColor="var(--ac)" />
        <MetricCard title="Avg Mood"     value={avgMoodScore > 0 ? `${avgMoodScore.toFixed(1)}/10` : '—'} change={entries.length > 0 ? 'Based on entries' : 'No entries yet'} changePositive={avgMoodScore >= 6 ? true : null} barColor="var(--gr)" />
        <MetricCard title="Mood → P&L"   value={Object.keys(moodStats).length > 0 ? 'See below' : '—'} change="Correlation analysis" changePositive={null} barColor="var(--am)" />
        <MetricCard title="Streak"       value={`${streak}d`} change={streak > 0 ? 'consecutive days' : 'Start journaling today!'} changePositive={streak > 0} barColor="var(--pu)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: Calendar + Recent Entries */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Calendar */}
          <Panel noPadding action={
            <button
              onClick={() => setModal({ date: today, existing: byDate.get(today) })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{ background: byDate.has(today) ? 'rgba(99,153,34,0.15)' : 'var(--gr)', border: byDate.has(today) ? '1px solid rgba(99,153,34,0.35)' : 'none', color: byDate.has(today) ? 'var(--gr2)' : 'white', fontSize: '12px', cursor: 'pointer' }}>
              {byDate.has(today) ? '✓ Today logged' : '+ Log Today'}
            </button>
          } title="">
            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--bd)' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: '16px' }}>‹</button>
              <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 500 }}>{monthName}</span>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: '16px' }}>›</button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 px-4 pt-3 pb-1">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} className="text-center" style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.04em' }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 px-4 pb-4">
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
                  bg     = 'rgba(226,75,74,0.08)'
                  border = '1px solid rgba(226,75,74,0.18)'
                  dot    = 'var(--re)'
                }

                if (isToday) border = `1.5px solid var(--ac)`

                return (
                  <button
                    key={ds}
                    onClick={() => !future && setModal({ date: ds, existing: entry })}
                    disabled={!!future}
                    className="relative flex flex-col items-center justify-center rounded-md transition-all"
                    style={{
                      height: '44px', background: bg, border,
                      cursor: future ? 'default' : 'pointer',
                      opacity: future ? 0.3 : 1,
                    }}
                    onMouseEnter={e => { if (!future) e.currentTarget.style.background = 'var(--s3)' }}
                    onMouseLeave={e => { if (!future) e.currentTarget.style.background = bg }}
                  >
                    <span style={{ fontSize: '12px', color: isToday ? 'var(--ac)' : 'var(--t2)', fontWeight: isToday ? 500 : 400 }}>
                      {day.getDate()}
                    </span>
                    {dot && !future && (
                      <span className="rounded-full" style={{ width: '5px', height: '5px', background: dot, display: 'block', marginTop: '2px' }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 pb-3">
              {([['var(--gr2)', 'Journaled'], ['var(--re)', 'Missed'], ['var(--ac)', 'Today']] as [string, string][]).map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="rounded-full" style={{ width: '7px', height: '7px', background: color, display: 'inline-block' }} />
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Recent Entries */}
          <Panel title="" noPadding action={
            <span style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>
              {isFiltered ? `${filteredEntries.length} result${filteredEntries.length !== 1 ? 's' : ''}` : 'Recent Entries'}
            </span>
          }>
            {/* Search + mood filter bar */}
            <div className="flex flex-col gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--bd)' }}>
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', fontSize: '13px', pointerEvents: 'none' }}>⌕</span>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search entries by keyword or tag…"
                  style={{
                    width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)',
                    borderRadius: '8px', padding: '8px 32px 8px 30px',
                    color: 'var(--t1)', fontSize: '13px', outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                )}
              </div>
              {/* Mood filter chips */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setMoodFilter('')}
                  style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                    background: moodFilter === '' ? 'var(--s4)' : 'transparent',
                    border: moodFilter === '' ? '1px solid var(--bd2)' : '1px solid transparent',
                    color: moodFilter === '' ? 'var(--t1)' : 'var(--t3)',
                  }}>All</button>
                {MOODS.map(m => (
                  <button key={m} onClick={() => setMoodFilter(moodFilter === m ? '' : m)}
                    style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                      background: moodFilter === m ? `${MOOD_COLOR[m]}20` : 'transparent',
                      border: moodFilter === m ? `1px solid ${MOOD_COLOR[m]}60` : '1px solid transparent',
                      color: moodFilter === m ? MOOD_COLOR[m] : 'var(--t3)',
                      textTransform: 'capitalize',
                    }}>{m}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6"><span style={{ color: 'var(--t3)', fontSize: '13px' }}>Loading…</span></div>
            ) : entries.length === 0 ? (
              <div className="flex items-center justify-center py-6"><span style={{ color: 'var(--t3)', fontSize: '13px' }}>No entries yet — click a day on the calendar to start journaling.</span></div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <span style={{ color: 'var(--t3)', fontSize: '13px' }}>No entries match your search.</span>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                {filteredEntries.slice(0, 30).map((entry, i) => {
                  const mood    = entry.mood as Mood | undefined
                  const dayPnl  = pnlByDate.get(entry.entry_date)
                  return (
                    <div key={entry.id}
                      className="flex flex-col gap-2 px-4 py-3 cursor-pointer transition-colors"
                      style={{ borderBottom: i < Math.min(filteredEntries.length, 30) - 1 ? '1px solid var(--bd)' : 'none' }}
                      onClick={() => setModal({ date: entry.entry_date, existing: entry })}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--s3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      <div className="flex items-center gap-2 flex-wrap">
                        {mood && <span className="rounded-full flex-shrink-0" style={{ width: '8px', height: '8px', display: 'inline-block', background: MOOD_COLOR[mood] }} />}
                        <span style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>
                          {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        {mood && <span style={{ color: MOOD_COLOR[mood], fontSize: '11px' }}>{mood} · {MOOD_SCORE[mood]}/10</span>}
                        {entry.energy_level && <span style={{ color: 'var(--t3)', fontSize: '11px' }}>⚡{entry.energy_level}/10</span>}
                        {dayPnl !== undefined && (
                          <span style={{ color: dayPnl >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '11px', marginLeft: 'auto' }}>
                            {dayPnl >= 0 ? '+' : ''}€{Math.abs(dayPnl).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {entry.body_text && (() => {
                        const q = search.trim().toLowerCase()
                        const text = entry.body_text!
                        if (!q) return (
                          <p style={{ color: 'var(--t1)', fontSize: '12px', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as never }}>
                            {text}
                          </p>
                        )
                        const idx = text.toLowerCase().indexOf(q)
                        if (idx === -1) return (
                          <p style={{ color: 'var(--t1)', fontSize: '12px', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as never }}>
                            {text}
                          </p>
                        )
                        const start = Math.max(0, idx - 30)
                        const snippet = (start > 0 ? '…' : '') + text.slice(start, idx + q.length + 60)
                        const matchStart = idx - start + (start > 0 ? 1 : 0)
                        return (
                          <p style={{ color: 'var(--t1)', fontSize: '12px', lineHeight: '1.6' }}>
                            {snippet.slice(0, matchStart)}
                            <mark style={{ background: 'rgba(77,143,255,0.3)', color: 'var(--t1)', borderRadius: '2px', padding: '0 2px' }}>{snippet.slice(matchStart, matchStart + q.length)}</mark>
                            {snippet.slice(matchStart + q.length)}
                          </p>
                        )
                      })()}

                      {(entry.tags ?? []).length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {(entry.tags ?? []).map(tag => (
                            <span key={tag} style={{ fontSize: '10px', color: 'var(--t3)', background: 'var(--s3)', padding: '1px 6px', borderRadius: '20px' }}>#{tag}</span>
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
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Panel title="Mood → P&L Correlation">
            {Object.keys(moodStats).length === 0 ? (
              <p style={{ color: 'var(--t3)', fontSize: '13px' }}>Add journal entries to see how your mood affects your trading P&L.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <p style={{ color: 'var(--t2)', fontSize: '12px', lineHeight: '1.6' }}>
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
                          <span className="rounded-full" style={{ width: '8px', height: '8px', background: MOOD_COLOR[m], display: 'inline-block' }} />
                          <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500, textTransform: 'capitalize' }}>{m}</span>
                          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{count} day{count !== 1 ? 's' : ''}</span>
                        </div>
                        <span style={{ color: avg >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '12px', fontWeight: 500 }}>
                          {avg >= 0 ? '+' : ''}€{Math.abs(avg).toFixed(2)} avg
                        </span>
                      </div>
                      <div className="rounded-full overflow-hidden" style={{ height: '5px', background: 'var(--s3)' }}>
                        <div style={{
                          width: `${(Math.abs(avg) / maxAbs) * 100}%`,
                          height: '100%',
                          background: avg >= 0 ? MOOD_COLOR[m] : 'var(--re)',
                          borderRadius: '4px',
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
                    <div className="rounded-lg p-3 mt-2" style={{ background: 'rgba(232,201,106,0.05)', border: '1px solid rgba(232,201,106,0.15)' }}>
                      <p style={{ color: 'var(--go2)', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>JARVIS INSIGHT</p>
                      <p style={{ color: 'var(--t2)', fontSize: '12px', lineHeight: '1.6' }}>
                        You trade best when feeling <strong style={{ color: MOOD_COLOR[best as Mood] }}>{best}</strong> (avg {bestAvg >= 0 ? '+' : ''}€{Math.abs(bestAvg).toFixed(2)}/day).
                        {best !== worst && ` Avoid trading when <strong style="color:${MOOD_COLOR[worst as Mood]}">${worst}</strong> (avg ${worstAvg >= 0 ? '+' : ''}€${Math.abs(worstAvg).toFixed(2)}/day).`}
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}
          </Panel>

          {/* Quick stats */}
          <Panel title="This Month at a Glance">
            <div className="flex flex-col gap-2">
              {MOODS.map(m => {
                const count = entries.filter(e => e.mood === m && e.entry_date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).length
                if (count === 0) return null
                return (
                  <div key={m} className="flex items-center gap-2">
                    <span className="rounded-full flex-shrink-0" style={{ width: '7px', height: '7px', background: MOOD_COLOR[m], display: 'inline-block' }} />
                    <span style={{ color: 'var(--t2)', fontSize: '12px', textTransform: 'capitalize', flex: 1 }}>{m}</span>
                    <div className="flex gap-1">
                      {Array(count).fill(null).map((_, i) => (
                        <span key={i} className="rounded-full" style={{ width: '7px', height: '7px', background: MOOD_COLOR[m], display: 'inline-block', opacity: 0.7 }} />
                      ))}
                    </div>
                    <span style={{ color: 'var(--t3)', fontSize: '11px', minWidth: '20px', textAlign: 'right' }}>{count}d</span>
                  </div>
                )
              })}
              {entries.filter(e => e.entry_date.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).length === 0 && (
                <p style={{ color: 'var(--t3)', fontSize: '12px' }}>No entries this month yet.</p>
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
          onSave={addEntry}
          onDelete={modal.existing ? deleteEntry : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
