'use client'

import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import Panel from '@/components/ui/Panel'
import { Label, Num, Select } from '@/components/ui/vq'
import Badge from '@/components/ui/Badge'
import type { Task, TaskCategory, TaskPriority } from '@/types'
import Icon from '@/components/ui/Icon'

const TASK_CATEGORIES: { key: TaskCategory; label: string }[] = [
  { key: 'trading',   label: 'Trading'   },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'life',      label: 'Life'      },
  { key: 'general',   label: 'General'   },
]
const TASK_PRIORITIES: { key: TaskPriority; label: string }[] = [
  { key: 'high',   label: 'High'   },
  { key: 'medium', label: 'Medium' },
  { key: 'low',    label: 'Low'    },
]


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
    borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--t1)', fontSize: 'var(--text-base)', outline: 'none',
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
      <div className="fixed z-50 vq-r flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '420px', maxWidth: 'calc(100vw - 32px)',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          padding: '24px',
        }}>
        <div className="flex items-center justify-between">
          <h2 style={{ color: 'var(--color-ink-1)', fontSize: 'var(--text-md)' }}>New task</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 'var(--text-xl)', cursor: 'pointer' }}><Icon name="close" size={13} /></button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder="What needs to be done?"
          autoFocus
          style={inputStyle}
          onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
          onBlur={e => (e.target.style.borderColor = 'var(--color-line-1)')}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="vq-label" style={{ display: 'block' }}>Category</label>
            <Select ariaLabel="Category" options={TASK_CATEGORIES} value={category} onChange={setCategory} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="vq-label" style={{ display: 'block' }}>Priority</label>
            <Select ariaLabel="Priority" options={TASK_PRIORITIES} value={priority} onChange={setPriority} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="vq-label" style={{ display: 'block' }}>Due date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' }}
            onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
            onBlur={e => (e.target.style.borderColor = 'var(--color-line-1)')} />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2"
            style={{ background: 'transparent', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-line-1)', color: 'var(--color-ink-2)', fontSize: 'var(--text-base)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 py-2"
            style={{ background: 'var(--color-ink-1)', borderRadius: 'var(--radius-sm)', border: 'none', color: 'var(--color-void)', fontSize: 'var(--text-base)', cursor: 'pointer', opacity: (!title.trim() || saving) ? 0.5 : 1 }}>
            {saving ? 'Adding…' : 'Add task'}
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
      className="flex items-start gap-3 transition-colors group"
      style={{ padding: '7px 14px', borderBottom: '1px solid var(--color-line-1)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-state-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !done)}
        className="flex-shrink-0 mt-0.5 flex items-center justify-center rounded transition-all"
        style={{
          width: '14px', height: '14px', borderRadius: 'var(--radius-xs)',
          border: done ? 'none' : '1px solid var(--color-line-2)',
          background: done ? 'var(--color-ink-1)' : 'transparent',
          cursor: 'pointer',
        }}>
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="var(--color-void)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <span style={{
          color: done ? 'var(--color-ink-4)' : 'var(--color-ink-1)', fontSize: 'var(--text-base)',
          textDecoration: done ? 'line-through' : 'none',
        }}>
          {task.title}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={task.category}>{task.category}</Badge>
          {task.priority === 'high' && <Badge variant="high">high</Badge>}
          {task.is_recurring && (
            <span style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }} className="inline-flex items-center gap-1"><Icon name="repeat" size={10} />{task.recurrence}</span>
          )}
          {isOverdue && (
            <span style={{ color: 'var(--color-down)', fontSize: 'var(--text-xs)' }}>overdue</span>
          )}
        </div>
      </div>

      {task.due_date && (
        <span className="vq-num" style={{ color: isOverdue ? 'var(--color-down)' : 'var(--color-ink-3)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
          {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </span>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ background: 'none', border: 'none', color: 'var(--re)', cursor: 'pointer', fontSize: 'var(--text-lg)', padding: '0 2px', lineHeight: 1 }}
        title="Delete task">
        <Icon name="close" size={13} />
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
    <div className="flex flex-col gap-3">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { title: 'Done today', value: `${doneToday}/${todayTasks.length}`,  sub: 'tasks completed', color: 'var(--color-ink-1)' },
          { title: 'Open',       value: String(tasks.filter(t => t.status !== 'done').length), sub: 'pending', color: 'var(--color-ink-1)' },
          { title: 'Overdue',    value: String(overdueTasks.length), sub: 'needs attention', color: overdueTasks.length > 0 ? 'var(--color-down)' : 'var(--color-ink-1)' },
          { title: 'Total done', value: String(doneTasks.length),    sub: 'all time',        color: 'var(--color-ink-1)' },
        ].map(m => (
          <div key={m.title}
            style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)' }}>
            <Label>{m.title}</Label>
            <div style={{ margin: '4px 0 2px' }}>
              <Num size="xl" style={{ color: m.color }}>{m.value}</Num>
            </div>
            <Label>{m.sub}</Label>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Today */}
        <Panel title={`Today (${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })})`}
          noPadding
          action={
            <button onClick={() => setShowModal(true)}
              style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', padding: '3px 9px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: 'var(--color-ink-1)', color: 'var(--color-void)' }}>
              + Add task
            </button>
          }>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>Loading…</span>
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>No tasks for today.</p>
              <button onClick={() => setShowModal(true)}
                style={{ background: 'var(--color-ink-1)', border: 'none', color: 'var(--color-void)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', padding: '5px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                + Add one
              </button>
            </div>
          ) : (
            todayTasks.map(t => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={handleDelete} />
            ))
          )}
        </Panel>

        <div className="flex flex-col gap-3">
          {/* Overdue */}
          <Panel title="Overdue" noPadding>
            {overdueTasks.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <span style={{ color: 'var(--color-up)', fontSize: 'var(--text-base)' }}>All clear — nothing overdue</span>
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
                <span style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>Nothing scheduled ahead.</span>
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
