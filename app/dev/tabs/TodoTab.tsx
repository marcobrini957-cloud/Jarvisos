'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MONO, G } from '../ui'

type Todo = {
  id: string
  title: string
  category: string
  done: boolean
  done_at: string | null
  created_at: string
}

const CATEGORIES = ['urgent', 'general', 'billing', 'copy-trading', 'email', 'infra', 'legal', 'growth'] as const
const CAT_COLOR: Record<string, string> = {
  urgent: '#FF3347', billing: '#FFB830', 'copy-trading': '#A87EFF', email: '#4B8FFF',
  infra: '#00EEFF', legal: '#FF9500', growth: '#00FF85', general: 'rgba(255,255,255,0.35)',
}

export function TodoTab() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newCat, setNewCat] = useState<string>('general')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/dev/todos')
    if (res.ok) setTodos(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(todo: Todo) {
    const res = await fetch(`/api/dev/todos/${todo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !todo.done }),
    })
    if (res.ok) setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
  }

  async function remove(id: string) {
    await fetch(`/api/dev/todos/${id}`, { method: 'DELETE' })
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const res = await fetch('/api/dev/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), category: newCat }),
    })
    if (res.ok) {
      const todo = await res.json()
      setTodos(prev => [todo, ...prev])
      setNewTitle('')
      inputRef.current?.focus()
    }
    setAdding(false)
  }

  const open = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)
  const visible = filter === 'open' ? open : filter === 'done' ? done : todos

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: MONO }}>Dev To-Do</div>
          <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '1px 8px', color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: MONO }}>{open.length} open · {done.length} done</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['open', 'done', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'rgba(0,255,133,0.1)' : 'transparent',
              border: `1px solid ${filter === f ? 'rgba(0,255,133,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '6px', color: filter === f ? G : 'rgba(255,255,255,0.3)',
              fontSize: '10px', padding: '4px 10px', cursor: 'pointer', fontFamily: MONO,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Add task form */}
      <form onSubmit={add} style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          ref={inputRef}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a task..."
          style={{
            flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '7px', padding: '8px 12px', color: '#fff', fontSize: '12px',
            fontFamily: MONO, outline: 'none',
          }}
        />
        <select
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '7px', padding: '8px 10px', color: CAT_COLOR[newCat],
            fontSize: '11px', fontFamily: MONO, outline: 'none', cursor: 'pointer',
          }}
        >
          {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#0a0a0f', color: CAT_COLOR[c] }}>{c}</option>)}
        </select>
        <button
          type="submit"
          disabled={adding || !newTitle.trim()}
          style={{
            background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.2)',
            borderRadius: '7px', color: G, fontSize: '11px', padding: '8px 16px',
            cursor: 'pointer', fontFamily: MONO, letterSpacing: '0.06em', whiteSpace: 'nowrap',
          }}
        >+ Add</button>
      </form>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {visible.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', padding: '12px 0', fontFamily: MONO }}>
            {filter === 'done' ? 'Nothing completed yet.' : 'All clear — no open tasks.'}
          </div>
        )}
        {visible.map(todo => (
          <div key={todo.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: '8px',
            background: todo.done ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)',
            border: `1px solid ${todo.done ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)'}`,
            transition: 'opacity 0.2s',
          }}>
            <button
              onClick={() => toggle(todo)}
              style={{
                width: 18, height: 18, borderRadius: '4px', flexShrink: 0, cursor: 'pointer',
                background: todo.done ? G : 'transparent',
                border: `1.5px solid ${todo.done ? G : 'rgba(255,255,255,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {todo.done && <span style={{ color: '#000', fontSize: '10px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
            </button>

            <span style={{
              fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', flexShrink: 0,
              background: `${CAT_COLOR[todo.category]}18`,
              border: `1px solid ${CAT_COLOR[todo.category]}30`,
              color: CAT_COLOR[todo.category], fontFamily: MONO, letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>{todo.category}</span>

            <span style={{
              flex: 1, fontSize: '12px', fontFamily: MONO,
              color: todo.done ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
              textDecoration: todo.done ? 'line-through' : 'none',
            }}>{todo.title}</span>

            <button
              onClick={() => remove(todo.id)}
              style={{
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.15)',
                fontSize: '14px', cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0,
              }}
            >×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
