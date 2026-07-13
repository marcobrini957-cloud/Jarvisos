'use client'

import Badge from '@/components/ui/Badge'
import type { Task } from '@/types'
import { TODAY } from './helpers'

// ── Task Row ──────────────────────────────────────────────────────────────────

export function TaskRow({ task, onToggle, onDelete }: {
  task: Task
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
}) {
  const done      = task.status === 'done'
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
          color: done ? 'var(--t3)' : 'var(--t1)',
          fontSize: '13px',
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
