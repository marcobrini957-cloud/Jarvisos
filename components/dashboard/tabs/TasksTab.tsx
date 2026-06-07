'use client'

import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import Panel from '@/components/ui/Panel'
import Badge from '@/components/ui/Badge'
import type { Task, TaskCategory, TaskPriority } from '@/types'

const TODAY = new Date().toISOString().split('T')[0]

// ── Add Task Modal ────────────────────────────────────────────────────────────

function AddTaskModal({ onSave, onClose }: {
  onSave: (t: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
}) {
  const [title,    setTitle]    = useState('')
  const [category, setCategory] = useState<TaskCategory>('trading')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate,  setDueDate]  = useState(TODAY)
  const [saving,   setSaving]   = useState(false)

  const inputStyle = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)',
    borderRadius: '8px', padding: '10px 12px', color: 'var(--t1)', fontSize: '13px', outline: 'none',
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title:        title.trim(),
        description:  null,
        category,
        priority,
        status:       'todo',
        due_date:     dueDate,
        completed_at: null,
        source:       'manual',
        is_recurring: false,
        recurrence:   null,
        tags:         null,
      })
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
          width: '420px', maxWidth: 'calc(100vw - 32px)',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '24px',
        }}>
        <div className="flex items-center justify-between">
          <h2 style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 500 }}>New Task</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder="What needs to be done?"
          autoFocus
          style={inputStyle}
          onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
          onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label style={{ color: 'var(--t2)', fontSize: '12px' }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as TaskCategory)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="trading">Trading</option>
              <option value="portfolio">Portfolio</option>
              <option value="life">Life</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label style={{ color: 'var(--t2)', fontSize: '12px' }}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label style={{ color: 'var(--t2)', fontSize: '12px' }}>Due date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }}
            onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
            onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-md"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 py-2.5 rounded-md font-medium"
            style={{ background: 'var(--ac)', border: 'none', color: 'white', fontSize: '13px', cursor: 'pointer', opacity: (!title.trim() || saving) ? 0.5 : 1 }}>
            {saving ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete }: {
  task: Task
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
}) {
  const done     = task.status === 'done'
  const isOverdue = task.due_date && task.due_date < TODAY && !done

  return (
    <div
      className="flex items-start gap-3 py-2.5 px-4 transition-colors group"
      style={{ borderBottom: '1px solid var(--bd)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--s3)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !done)}
        className="flex-shrink-0 mt-0.5 flex items-center justify-center rounded transition-all"
        style={{
          width: '16px', height: '16px',
          border: done ? 'none' : '1.5px solid var(--bd2)',
          background: done ? 'var(--ac)' : 'transparent',
          cursor: 'pointer',
        }}>
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <span style={{
          color: done ? 'var(--t3)' : 'var(--t1)', fontSize: '13px',
          textDecoration: done ? 'line-through' : 'none',
        }}>
          {task.title}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={task.category}>{task.category}</Badge>
          {task.priority === 'high' && <Badge variant="high">high</Badge>}
          {task.is_recurring && (
            <span style={{ color: 'var(--t3)', fontSize: '10px' }}>↻ {task.recurrence}</span>
          )}
          {isOverdue && (
            <span style={{ color: 'var(--re)', fontSize: '10px', fontWeight: 500 }}>overdue</span>
          )}
        </div>
      </div>

      {task.due_date && (
        <span style={{ color: isOverdue ? 'var(--re)' : 'var(--t3)', fontSize: '11px', flexShrink: 0 }}>
          {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </span>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ background: 'none', border: 'none', color: 'var(--re)', cursor: 'pointer', fontSize: '16px', padding: '0 2px', lineHeight: 1 }}
        title="Delete task">
        ×
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TasksTab() {
  const { tasks, loading, toggleTask, addTask, reload } = useTasks()
  const [showModal, setShowModal] = useState(false)

  async function handleDelete(id: string) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('tasks').delete().eq('id', id)
    await reload()
  }

  const todayTasks   = tasks.filter(t => t.due_date === TODAY || !t.due_date)
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < TODAY && t.status !== 'done')
  const doneTasks    = tasks.filter(t => t.status === 'done')
  const doneToday    = todayTasks.filter(t => t.status === 'done').length

  return (
    <div className="flex flex-col gap-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: 'Done Today',   value: `${doneToday}/${todayTasks.length}`,  sub: 'tasks completed',   color: 'var(--gr)' },
          { title: 'Open',         value: String(tasks.filter(t => t.status !== 'done').length), sub: 'pending',   color: 'var(--ac)' },
          { title: 'Overdue',      value: String(overdueTasks.length), sub: 'needs attention', color: overdueTasks.length > 0 ? 'var(--re)' : 'var(--gr)' },
          { title: 'Total Done',   value: String(doneTasks.length),    sub: 'all time',         color: 'var(--pu)' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today */}
        <Panel title={`Today (${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })})`}
          noPadding
          action={
            <button onClick={() => setShowModal(true)}
              style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'var(--ac)', color: 'white', fontWeight: 500 }}>
              + Add Task
            </button>
          }>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span style={{ color: 'var(--t3)', fontSize: '13px' }}>Loading…</span>
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p style={{ color: 'var(--t3)', fontSize: '13px' }}>No tasks for today.</p>
              <button onClick={() => setShowModal(true)}
                style={{ background: 'var(--ac)', border: 'none', color: 'white', fontSize: '12px', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                + Add one
              </button>
            </div>
          ) : (
            todayTasks.map(t => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={handleDelete} />
            ))
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          {/* Overdue */}
          <Panel title="Overdue" noPadding>
            {overdueTasks.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <span style={{ color: 'var(--gr2)', fontSize: '13px' }}>All clear — nothing overdue ✓</span>
              </div>
            ) : (
              overdueTasks.map(t => (
                <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={handleDelete} />
              ))
            )}
          </Panel>

          {/* Upcoming / all open */}
          <Panel title="Upcoming" noPadding>
            {tasks.filter(t => t.due_date && t.due_date > TODAY && t.status !== 'done').length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Nothing scheduled ahead.</span>
              </div>
            ) : (
              tasks
                .filter(t => t.due_date && t.due_date > TODAY && t.status !== 'done')
                .slice(0, 5)
                .map(t => (
                  <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={handleDelete} />
                ))
            )}
          </Panel>
        </div>
      </div>

      {showModal && (
        <AddTaskModal
          onSave={addTask}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
