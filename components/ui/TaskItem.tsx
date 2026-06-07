'use client'

import { useState } from 'react'
import Badge from './Badge'
import type { Task } from '@/types'

interface TaskItemProps {
  task: Task
  onToggle?: (id: string, done: boolean) => void
}

export default function TaskItem({ task, onToggle }: TaskItemProps) {
  const [done, setDone] = useState(task.status === 'done')

  function handleToggle() {
    const newDone = !done
    setDone(newDone)
    onToggle?.(task.id, newDone)
  }

  return (
    <div
      className="flex items-start gap-3 py-2.5 px-1 rounded-md transition-colors group cursor-pointer"
      style={{ borderBottom: '1px solid var(--bd)' }}
      onClick={handleToggle}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s3)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Checkbox */}
      <div
        className="flex-shrink-0 mt-0.5 flex items-center justify-center rounded"
        style={{
          width: '16px',
          height: '16px',
          border: done ? 'none' : '1.5px solid var(--bd2)',
          background: done ? 'var(--ac)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        <span
          style={{
            color: done ? 'var(--t3)' : 'var(--t1)',
            fontSize: '13px',
            textDecoration: done ? 'line-through' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {task.title}
        </span>
        <Badge variant={task.category}>{task.category}</Badge>
        {task.priority === 'high' && <Badge variant="high">high</Badge>}
      </div>

      {/* Due date */}
      {task.due_date && (
        <span style={{ color: 'var(--t3)', fontSize: '11px', flexShrink: 0 }}>
          {new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </span>
      )}
    </div>
  )
}
