'use client'

import { useState } from 'react'
import { useHabits } from '@/hooks/useHabits'
import { useTasks }  from '@/hooks/useTasks'
import Panel         from '@/components/ui/Panel'
import Icon          from '@/components/ui/Icon'
import type { Task } from '@/types'
import { TODAY, categoryColor, last7Days } from './discipline/helpers'
import { habitIcon } from './discipline/habitIcon'
import { Num } from '@/components/ui/vq'
import { AddHabitModal } from './discipline/AddHabitModal'
import { AddTaskModal } from './discipline/AddTaskModal'
import { TaskRow } from './discipline/TaskRow'
import { TraderDnaCard } from '@/components/dashboard/TraderDnaCard'

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DisciplineTab() {
  // Habits
  const {
    habits, loading: habitsLoading,
    today, isCompleted, toggleHabit,
    addHabit, deleteHabit,
    calcStreak, completionRate,
    todayCompleted, todayTotal,
  } = useHabits()

  // Tasks
  const { tasks, loading: tasksLoading, toggleTask, addTask, reload } = useTasks()

  // Modal state
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [showAddTask,  setShowAddTask]  = useState(false)

  const days7 = last7Days()

  // Habit metrics
  const habitCompletionPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0
  const bestStreak         = habits.length > 0 ? Math.max(...habits.map(h => calcStreak(h.id))) : 0

  // Task metrics
  const todayTasks   = tasks.filter(t => t.due_date === TODAY || !t.due_date)
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < TODAY && t.status !== 'done')
  const doneToday    = todayTasks.filter(t => t.status === 'done').length

  async function handleDeleteTask(id: string) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
    await reload()
  }

  // ── Metric cards ────────────────────────────────────────────────────────────

  const metrics = [
    {
      title: 'Habits Today',
      value: `${todayCompleted}/${todayTotal}`,
      sub:   `${habitCompletionPct}% complete`,
      // A count of habits is not a P&L. Red on "0/0" told someone who has not
      // set any habits up yet that they were losing, and green on a full house
      // borrowed profit's colour for a checklist. Complete earns the key
      // accent; everything else is ink.
      color: habits.length > 0 && habitCompletionPct === 100 ? 'var(--color-key)' : 'var(--color-ink-1)',
    },
    {
      title: 'Best Streak',
      value: habits.length > 0 ? `${bestStreak}d` : '—',
      sub:   'consecutive days',
      color: 'var(--color-ink-3)',
    },
    {
      title: 'Tasks Today',
      value: `${doneToday}/${todayTasks.length}`,
      sub:   'tasks completed',
      color: todayTasks.length > 0 && doneToday === todayTasks.length ? 'var(--color-key)' : 'var(--color-ink-1)',
    },
    {
      title: 'Overdue',
      value: String(overdueTasks.length),
      sub:   overdueTasks.length === 0 ? 'all clear' : 'needs attention',
      // Nothing overdue is the normal state, not a win — ink. Something
      // overdue is a genuine warning, which is what --color-warn is for.
      color: overdueTasks.length > 0 ? 'var(--color-warn)' : 'var(--color-ink-1)',
    },
  ]

  return (
    <div className="flex flex-col gap-3">

      {/* ── Trader DNA ── */}
      <TraderDnaCard />

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div
            key={m.title}
            className="relative vq-r p-4 overflow-hidden"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
            <p className="vq-label" style={{ display: 'block' }}>
              {m.title}
            </p>
            <div style={{ marginTop: '4px' }}>
              <Num size="xl" style={{ color: m.color }}>{m.value}</Num>
            </div>
            <p style={{ color: 'var(--color-ink-3)', fontSize: 'var(--text-xs)', marginTop: '2px' }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Split panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* ── Habits section (lg:col-span-2) ── */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Panel
            title={`Habits — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
            noPadding
            action={
              <button
                onClick={() => setShowAddHabit(true)}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                  padding: '3px 9px', borderRadius: 'var(--radius-sm)',
                  border: 'none', cursor: 'pointer', background: 'var(--color-ink-1)',
                  color: 'var(--color-void)',
                }}>
                + Add habit
              </button>
            }>

            {habitsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>Loading…</span>
              </div>
            ) : habits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>No habits yet.</p>
                <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)', textAlign: 'center', maxWidth: '300px' }}>
                  Add daily habits like "Morning journal", "No revenge trading", or "Exercise" to build consistency.
                </p>
                <button
                  onClick={() => setShowAddHabit(true)}
                  style={{ background: 'var(--color-ink-1)', border: 'none', color: 'var(--color-void)', fontSize: 'var(--text-base)', padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  + Add first habit
                </button>
              </div>
            ) : (
              <>
                {habits.map(habit => {
                  const done   = isCompleted(habit.id, today)
                  const streak = calcStreak(habit.id)
                  const color  = categoryColor(habit.category)

                  return (
                    <div
                      key={habit.id}
                      className="flex items-center gap-3 transition-colors group"
                      style={{
                        padding: '8px 14px',
                        borderBottom: '1px solid var(--color-line-1)',
                        borderLeft: `2px solid ${done ? 'var(--color-ink-1)' : 'transparent'}`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-state-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      {/* Toggle button */}
                      <button
                        onClick={() => toggleHabit(habit.id, today)}
                        className="flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          width: '28px', height: '28px',
                          borderRadius: 'var(--radius-sm)',
                          background: done ? 'var(--color-surface-3)' : 'transparent',
                          border: '1px solid var(--color-line-1)',
                          cursor: 'pointer',
                          color: done ? 'var(--color-ink-1)' : 'var(--color-ink-4)',
                        }}
                        aria-pressed={done}
                        title={done ? 'Done today' : 'Mark done'}>
                        <Icon name={habitIcon(habit.icon)} size={15} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p style={{ color: done ? 'var(--color-ink-3)' : 'var(--color-ink-1)', fontSize: 'var(--text-base)', textDecoration: done ? 'line-through' : 'none' }}>
                          {habit.name}
                        </p>
                        <p style={{ color: 'var(--color-ink-4)', fontSize: 'var(--text-xs)', marginTop: '1px' }}>
                          <span style={{ color }}>{habit.category}</span>
                          {streak > 0 && <span> · {streak} day streak</span>}
                        </p>
                      </div>

                      {/* 7-day dots */}
                      <div className="flex gap-1 items-center flex-shrink-0">
                        {days7.map(d => (
                          <div
                            key={d}
                            title={d}
                            style={{
                              width: '5px', height: '5px', borderRadius: '50%',
                              background: isCompleted(habit.id, d) ? 'var(--color-ink-1)' : 'var(--color-surface-3)',
                              opacity: d === today ? 1 : 0.7,
                            }}
                          />
                        ))}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => { if (confirm(`Remove "${habit.name}"?`)) deleteHabit(habit.id) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'none', border: 'none', color: 'var(--re)', cursor: 'pointer', fontSize: 'var(--text-lg)', lineHeight: 1, padding: '0 2px' }}
                        title="Remove habit">
                        ×
                      </button>
                    </div>
                  )
                })}

                {todayCompleted === todayTotal && todayTotal > 0 && (
                  <div className="flex items-center justify-center py-3">
                    <span style={{ color: 'var(--color-up)', fontSize: 'var(--text-base)' }}>All habits done today.</span>
                  </div>
                )}
              </>
            )}
          </Panel>

          {/* Habit stats bar */}
          {habits.length > 0 && (
            <Panel title="Habit stats">
              <div className="flex flex-col gap-3">
                {habits.map(habit => {
                  const rate   = completionRate(habit.id)
                  const streak = calcStreak(habit.id)
                  const color  = categoryColor(habit.category)
                  return (
                    <div key={habit.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--color-ink-3)' }}><Icon name={habitIcon(habit.icon)} size={13} /></span>
                          <span style={{ color: 'var(--t1)', fontSize: 'var(--text-base)' }}>{habit.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {streak > 0 && <Num size="2xs" tone="muted">{streak}d streak</Num>}
                          <Num size="sm" tone="neutral">{rate}%</Num>
                        </div>
                      </div>
                      <div className="overflow-hidden" style={{ height: '3px', background: 'var(--color-surface-2)' }}>
                        <div style={{ width: `${rate}%`, height: '100%', background: 'var(--color-ink-2)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}
        </div>

        {/* ── Tasks section ── */}
        <div className="flex flex-col gap-3">

          {/* Today's tasks */}
          <Panel
            title={`Tasks — ${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`}
            noPadding
            action={
              <button
                onClick={() => setShowAddTask(true)}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                  padding: '3px 9px', borderRadius: 'var(--radius-sm)',
                  border: 'none', cursor: 'pointer', background: 'var(--color-ink-1)',
                  color: 'var(--color-void)',
                }}>
                + Add task
              </button>
            }>

            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <span style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>Loading…</span>
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>No tasks for today.</p>
                <button
                  onClick={() => setShowAddTask(true)}
                  style={{ background: 'var(--color-ink-1)', border: 'none', color: 'var(--color-void)', fontSize: 'var(--text-base)', padding: '6px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  + Add one
                </button>
              </div>
            ) : (
              todayTasks.map(t => (
                <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={handleDeleteTask} />
              ))
            )}
          </Panel>

          {/* Overdue tasks */}
          <Panel title="Overdue" noPadding>
            {overdueTasks.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <span style={{ color: 'var(--color-ink-2)', fontSize: 'var(--text-base)' }}>All clear — nothing overdue</span>
              </div>
            ) : (
              overdueTasks.map(t => (
                <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={handleDeleteTask} />
              ))
            )}
          </Panel>

          {/* VELQUOR tip */}
          <div
            className="vq-r p-4"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <p className="label-caps" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Icon name="spark" size={11} />VELQUOR TIP
            </p>
            <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
              Traders who maintain consistent daily habits — especially journaling and pre-trade checklists — show 23% higher win rates on average.
              Track your habits for 30 days and VELQUOR will correlate them with your P&L.
            </p>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAddHabit && (
        <AddHabitModal
          onSave={addHabit}
          onClose={() => setShowAddHabit(false)}
        />
      )}

      {showAddTask && (
        <AddTaskModal
          onSave={addTask}
          onClose={() => setShowAddTask(false)}
        />
      )}
    </div>
  )
}
