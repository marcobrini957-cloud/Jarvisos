'use client'

import { useState } from 'react'
import { useHabits } from '@/hooks/useHabits'
import Panel from '@/components/ui/Panel'

const CATEGORY_COLORS: Record<string, string> = {
  trading: 'var(--ac)',
  mindset: 'var(--pu)',
  health:  'var(--gr2)',
  growth:  'var(--am2)',
  general: 'var(--t2)',
}

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'var(--t2)'
}

// Last 7 days for mini calendar dots
function last7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

// ── Add Habit Modal ───────────────────────────────────────────────────────────

function AddHabitModal({ onSave, onClose }: {
  onSave: (name: string, icon: string, category: string) => Promise<void>
  onClose: () => void
}) {
  const [name,     setName]     = useState('')
  const [icon,     setIcon]     = useState('✅')
  const [category, setCategory] = useState('general')
  const [saving,   setSaving]   = useState(false)

  const ICONS = ['✅','📓','💪','😴','🧠','📵','📊','📚','🏃','🥗','💧','🧘','📈','⏰','🎯','💡']

  const inputStyle = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)',
    borderRadius: '8px', padding: '10px 12px', color: 'var(--t1)', fontSize: '13px', outline: 'none',
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), icon, category)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed z-50 rounded-xl flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '400px', maxWidth: 'calc(100vw - 32px)',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '24px',
        }}>
        <div className="flex items-center justify-between">
          <h2 style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 500 }}>New Habit</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Icon picker */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: '12px', marginBottom: '6px', display: 'block' }}>Icon</label>
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map(em => (
              <button key={em} onClick={() => setIcon(em)}
                style={{
                  width: '36px', height: '36px', borderRadius: '8px', fontSize: '18px', cursor: 'pointer',
                  background: icon === em ? 'var(--ac)' : 'var(--s2)',
                  border: icon === em ? '1px solid var(--ac)' : '1px solid var(--bd2)',
                }}>
                {em}
              </button>
            ))}
          </div>
        </div>

        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder="Habit name (e.g. Morning journal)" autoFocus
          style={inputStyle}
          onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
          onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />

        <div className="flex flex-col gap-1.5">
          <label style={{ color: 'var(--t2)', fontSize: '12px' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="trading">Trading</option>
            <option value="mindset">Mindset</option>
            <option value="health">Health</option>
            <option value="growth">Growth</option>
            <option value="general">General</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-md"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 py-2.5 rounded-md font-medium"
            style={{ background: 'var(--gr)', border: 'none', color: 'white', fontSize: '13px', cursor: 'pointer', opacity: (!name.trim() || saving) ? 0.5 : 1 }}>
            {saving ? 'Adding…' : 'Add Habit'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HabitsTab() {
  const {
    habits, loading,
    today, isCompleted, toggleHabit,
    addHabit, deleteHabit,
    calcStreak, completionRate,
    todayCompleted, todayTotal,
  } = useHabits()

  const [showAdd, setShowAdd] = useState(false)
  const days7 = last7Days()

  const completionPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            title: "Today's Progress",
            value: `${todayCompleted}/${todayTotal}`,
            sub:   `${completionPct}% complete`,
            color: completionPct === 100 ? 'var(--gr)' : completionPct >= 50 ? 'var(--am)' : 'var(--re)',
          },
          {
            title: 'Habits Tracked',
            value: String(todayTotal),
            sub:   'active habits',
            color: 'var(--ac)',
          },
          {
            title: 'Best Streak',
            value: habits.length > 0 ? `${Math.max(...habits.map(h => calcStreak(h.id)))}d` : '—',
            sub:   'consecutive days',
            color: 'var(--pu)',
          },
          {
            title: '30-Day Rate',
            value: habits.length > 0
              ? `${Math.round(habits.reduce((s, h) => s + completionRate(h.id), 0) / habits.length)}%`
              : '—',
            sub:   'avg completion',
            color: 'var(--go2)',
          },
        ].map(m => (
          <div key={m.title} className="relative rounded-lg p-4 overflow-hidden"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
            <p style={{ color: 'var(--t2)', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>{m.title}</p>
            <p style={{ color: 'var(--t1)', fontSize: '22px', fontWeight: 500, lineHeight: 1.2, marginTop: '4px' }}>{m.value}</p>
            <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '2px' }}>{m.sub}</p>
            <div className="absolute bottom-0 left-0 right-0" style={{ height: '3px', background: m.color, opacity: 0.8 }} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today checklist */}
        <div className="lg:col-span-2">
          <Panel title={`Today — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
            noPadding
            action={
              <button onClick={() => setShowAdd(true)}
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'var(--gr)', color: 'white', fontWeight: 500 }}>
                + Add Habit
              </button>
            }>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span style={{ color: 'var(--t3)', fontSize: '13px' }}>Loading…</span>
              </div>
            ) : habits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <p style={{ color: 'var(--t2)', fontSize: '13px' }}>No habits yet.</p>
                <p style={{ color: 'var(--t3)', fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                  Add daily habits like "Morning journal", "No revenge trading", or "Exercise" — then track them every day to build consistency.
                </p>
                <button onClick={() => setShowAdd(true)}
                  style={{ background: 'var(--gr)', border: 'none', color: 'white', fontSize: '12px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                  + Add First Habit
                </button>
              </div>
            ) : (
              habits.map(habit => {
                const done   = isCompleted(habit.id, today)
                const streak = calcStreak(habit.id)
                const color  = categoryColor(habit.category)

                return (
                  <div key={habit.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors group"
                    style={{ borderBottom: '1px solid var(--bd)', borderLeft: `3px solid ${done ? color : 'transparent'}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--s3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                    {/* Toggle button */}
                    <button
                      onClick={() => toggleHabit(habit.id, today)}
                      className="flex items-center justify-center rounded-lg flex-shrink-0 transition-all"
                      style={{
                        width: '36px', height: '36px', fontSize: '18px',
                        background: done ? `${color}20` : 'var(--s2)',
                        border: done ? `1px solid ${color}40` : '1px solid var(--bd2)',
                        cursor: 'pointer',
                        filter: done ? 'none' : 'grayscale(0.5) opacity(0.6)',
                      }}>
                      {habit.icon}
                    </button>

                    <div className="flex-1">
                      <p style={{ color: done ? 'var(--t2)' : 'var(--t1)', fontSize: '13px', textDecoration: done ? 'line-through' : 'none' }}>
                        {habit.name}
                      </p>
                      <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '1px' }}>
                        <span style={{ color }}>{habit.category}</span>
                        {streak > 0 && <span> · 🔥 {streak} day streak</span>}
                      </p>
                    </div>

                    {/* Last 7 days dots */}
                    <div className="flex gap-1 items-center">
                      {days7.map(d => (
                        <div key={d}
                          title={d}
                          style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: isCompleted(habit.id, d) ? color : 'var(--s3)',
                            opacity: d === today ? 1 : 0.7,
                          }} />
                      ))}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => { if (confirm(`Remove "${habit.name}"?`)) deleteHabit(habit.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'none', border: 'none', color: 'var(--re)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}
                      title="Remove habit">
                      ×
                    </button>
                  </div>
                )
              })
            )}

            {habits.length > 0 && todayCompleted === todayTotal && (
              <div className="flex items-center justify-center py-4 gap-2">
                <span style={{ fontSize: '20px' }}>🎉</span>
                <span style={{ color: 'var(--gr2)', fontSize: '13px', fontWeight: 500 }}>All habits done today! Great discipline.</span>
              </div>
            )}
          </Panel>
        </div>

        {/* Stats panel */}
        <div className="flex flex-col gap-4">
          <Panel title="Habit Stats">
            {habits.length === 0 ? (
              <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Add habits to see stats.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {habits.map(habit => {
                  const rate   = completionRate(habit.id)
                  const streak = calcStreak(habit.id)
                  const color  = categoryColor(habit.category)
                  return (
                    <div key={habit.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{habit.icon}</span>
                          <span style={{ color: 'var(--t1)', fontSize: '12px' }}>{habit.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {streak > 0 && <span style={{ color: 'var(--am2)', fontSize: '11px' }}>🔥{streak}d</span>}
                          <span style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>{rate}%</span>
                        </div>
                      </div>
                      <div className="rounded-full overflow-hidden" style={{ height: '3px', background: 'var(--s3)' }}>
                        <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: '4px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>

          <div className="rounded-lg p-4" style={{ background: 'rgba(232,201,106,0.05)', border: '1px solid rgba(232,201,106,0.15)' }}>
            <p style={{ color: 'var(--go2)', fontSize: '11px', fontWeight: 500, marginBottom: '6px' }}>💡 JARVIS TIP</p>
            <p style={{ color: 'var(--t2)', fontSize: '12px', lineHeight: 1.6 }}>
              Research shows that traders who maintain consistent daily habits — especially journaling and pre-trade checklists — have 23% higher win rates on average.
              Track your habits for 30 days and Jarvis will correlate them with your P&L.
            </p>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddHabitModal
          onSave={addHabit}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
