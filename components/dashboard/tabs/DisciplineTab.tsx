'use client'

import { useState } from 'react'
import { useHabits } from '@/hooks/useHabits'
import { useTasks }  from '@/hooks/useTasks'
import Panel         from '@/components/ui/Panel'
import type { Task } from '@/types'
import { TODAY, categoryColor, last7Days } from './discipline/helpers'
import { AddHabitModal } from './discipline/AddHabitModal'
import { AddTaskModal } from './discipline/AddTaskModal'
import { TaskRow } from './discipline/TaskRow'

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
      color: habitCompletionPct === 100 ? 'var(--gr)' : habitCompletionPct >= 50 ? 'var(--am)' : 'var(--re)',
    },
    {
      title: 'Best Streak',
      value: habits.length > 0 ? `${bestStreak}d` : '—',
      sub:   'consecutive days',
      color: 'var(--pu)',
    },
    {
      title: 'Tasks Today',
      value: `${doneToday}/${todayTasks.length}`,
      sub:   'tasks completed',
      color: 'var(--ac)',
    },
    {
      title: 'Overdue',
      value: String(overdueTasks.length),
      sub:   overdueTasks.length === 0 ? 'all clear' : 'needs attention',
      color: overdueTasks.length > 0 ? 'var(--re)' : 'var(--gr)',
    },
  ]

  return (
    <div className="flex flex-col gap-4">

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div
            key={m.title}
            className="relative rounded-lg p-4 overflow-hidden"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
            <p style={{ color: 'var(--t2)', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>
              {m.title}
            </p>
            <p style={{ color: 'var(--t1)', fontSize: '22px', fontWeight: 500, lineHeight: 1.2, marginTop: '4px' }}>
              {m.value}
            </p>
            <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '2px' }}>{m.sub}</p>
            <div className="absolute bottom-0 left-0 right-0" style={{ height: '3px', background: m.color, opacity: 0.8 }} />
          </div>
        ))}
      </div>

      {/* ── Split panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Habits section (lg:col-span-2) ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Panel
            title={`Habits — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
            noPadding
            action={
              <button
                onClick={() => setShowAddHabit(true)}
                style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: '6px',
                  border: 'none', cursor: 'pointer', background: 'var(--gr)',
                  color: 'white', fontWeight: 500,
                }}>
                + Add Habit
              </button>
            }>

            {habitsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span style={{ color: 'var(--t3)', fontSize: '13px' }}>Loading…</span>
              </div>
            ) : habits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <p style={{ color: 'var(--t2)', fontSize: '13px' }}>No habits yet.</p>
                <p style={{ color: 'var(--t3)', fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                  Add daily habits like "Morning journal", "No revenge trading", or "Exercise" to build consistency.
                </p>
                <button
                  onClick={() => setShowAddHabit(true)}
                  style={{ background: 'var(--gr)', border: 'none', color: 'white', fontSize: '12px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                  + Add First Habit
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
                      className="flex items-center gap-3 px-4 py-3 transition-colors group"
                      style={{
                        borderBottom: '1px solid var(--bd)',
                        borderLeft: `3px solid ${done ? color : 'transparent'}`,
                      }}
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

                      <div className="flex-1 min-w-0">
                        <p style={{ color: done ? 'var(--t2)' : 'var(--t1)', fontSize: '13px', textDecoration: done ? 'line-through' : 'none' }}>
                          {habit.name}
                        </p>
                        <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '1px' }}>
                          <span style={{ color }}>{habit.category}</span>
                          {streak > 0 && <span> · 🔥 {streak} day streak</span>}
                        </p>
                      </div>

                      {/* 7-day dots */}
                      <div className="flex gap-1 items-center flex-shrink-0">
                        {days7.map(d => (
                          <div
                            key={d}
                            title={d}
                            style={{
                              width: '7px', height: '7px', borderRadius: '50%',
                              background: isCompleted(habit.id, d) ? color : 'var(--s3)',
                              opacity: d === today ? 1 : 0.7,
                            }}
                          />
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
                })}

                {todayCompleted === todayTotal && todayTotal > 0 && (
                  <div className="flex items-center justify-center py-4 gap-2">
                    <span style={{ fontSize: '20px' }}>🎉</span>
                    <span style={{ color: 'var(--gr2)', fontSize: '13px', fontWeight: 500 }}>All habits done today! Great discipline.</span>
                  </div>
                )}
              </>
            )}
          </Panel>

          {/* Habit stats bar */}
          {habits.length > 0 && (
            <Panel title="Habit Stats">
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
            </Panel>
          )}
        </div>

        {/* ── Tasks section ── */}
        <div className="flex flex-col gap-4">

          {/* Today's tasks */}
          <Panel
            title={`Tasks — ${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`}
            noPadding
            action={
              <button
                onClick={() => setShowAddTask(true)}
                style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: '6px',
                  border: 'none', cursor: 'pointer', background: 'var(--ac)',
                  color: 'white', fontWeight: 500,
                }}>
                + Add Task
              </button>
            }>

            {tasksLoading ? (
              <div className="flex items-center justify-center py-8">
                <span style={{ color: 'var(--t3)', fontSize: '13px' }}>Loading…</span>
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <p style={{ color: 'var(--t3)', fontSize: '13px' }}>No tasks for today.</p>
                <button
                  onClick={() => setShowAddTask(true)}
                  style={{ background: 'var(--ac)', border: 'none', color: 'white', fontSize: '12px', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer' }}>
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
                <span style={{ color: 'var(--gr2)', fontSize: '13px' }}>All clear — nothing overdue ✓</span>
              </div>
            ) : (
              overdueTasks.map(t => (
                <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={handleDeleteTask} />
              ))
            )}
          </Panel>

          {/* VELQUOR tip */}
          <div
            className="rounded-lg p-4"
            style={{ background: 'rgba(232,201,106,0.05)', border: '1px solid rgba(232,201,106,0.15)' }}>
            <p style={{ color: 'var(--go2)', fontSize: '11px', fontWeight: 500, marginBottom: '6px' }}>💡 VELQUOR TIP</p>
            <p style={{ color: 'var(--t2)', fontSize: '12px', lineHeight: 1.6 }}>
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
