'use client'

import { useState } from 'react'
import type { Task, TaskCategory, TaskPriority } from '@/types'
import { TODAY, inputStyle } from './helpers'
import { Select } from '@/components/ui/vq'

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


// ── Add Task Modal ────────────────────────────────────────────────────────────

export function AddTaskModal({ onSave, onClose }: {
  onSave: (t: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
}) {
  const [title,    setTitle]    = useState('')
  const [category, setCategory] = useState<TaskCategory>('trading')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate,  setDueDate]  = useState(TODAY)
  const [saving,   setSaving]   = useState(false)

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
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="vq-modal fixed z-50 vq-r flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '420px', maxWidth: 'calc(100vw - 32px)',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          padding: '24px',
        }}>
        <div className="flex items-center justify-between">
          <h2 style={{ color: 'var(--t1)', fontSize: 'var(--text-md)', fontWeight: 500 }}>New Task</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 'var(--text-xl)', cursor: 'pointer' }}>
            ×
          </button>
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
            <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>Category</label>
            <Select ariaLabel="Category" options={TASK_CATEGORIES} value={category} onChange={setCategory} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>Priority</label>
            <Select ariaLabel="Priority" options={TASK_PRIORITIES} value={priority} onChange={setPriority} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ ...inputStyle, colorScheme: 'dark' } as React.CSSProperties}
            onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
            onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 vq-r"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: 'var(--text-base)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 vq-r font-medium"
            style={{
              background: 'var(--color-ink-1)', border: 'none', color: 'var(--color-void)',
              fontSize: 'var(--text-base)', cursor: 'pointer',
              opacity: (!title.trim() || saving) ? 0.5 : 1,
            }}>
            {saving ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </div>
    </>
  )
}
