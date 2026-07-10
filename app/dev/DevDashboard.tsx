'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { devLogout } from './actions'
import { LogoMark } from '@/components/ui/LogoMark'

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

function TodoSection() {
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
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 22px', marginTop: '16px' }}>
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
            {/* Checkbox */}
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

            {/* Category tag */}
            <span style={{
              fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', flexShrink: 0,
              background: `${CAT_COLOR[todo.category]}18`,
              border: `1px solid ${CAT_COLOR[todo.category]}30`,
              color: CAT_COLOR[todo.category], fontFamily: MONO, letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>{todo.category}</span>

            {/* Title */}
            <span style={{
              flex: 1, fontSize: '12px', fontFamily: MONO,
              color: todo.done ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
              textDecoration: todo.done ? 'line-through' : 'none',
            }}>{todo.title}</span>

            {/* Delete */}
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

type Stats = {
  totalUsers: number
  onlineNow: number
  newToday: number
  newThisWeek: number
  totalTrades: number
  tradesToday: number
  tiers: { free: number; pro: number; ultra: number; unknown: number }
  funnel: { signedUp: number; connectedMt5: number; loggedTrade: number; signedUpPct: number; connectedPct: number; tradedPct: number }
  atRisk: { inactiveWeek: number; neverConnected: number }
  recentSignups: { id: string; email: string; created_at: string; last_seen_at: string | null; subscription_tier: string | null; mt5_login: string | null }[]
  bridgeStatus: string
  bridgeConnections: number
  supabaseStatus: string
  serverTime: string
  env: Record<string, boolean>
}

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const G = '#00FF85'
const R = '#FF3347'
const B = '#4B8FFF'
const GO = '#FFB830'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 22px' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: MONO }}>{title}</div>
      {children}
    </div>
  )
}

function Stat({ label, value, sub, color = '#fff' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '18px 20px' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: MONO }}>{label}</div>
      <div style={{ color, fontSize: '30px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, fontFamily: MONO }}>{value}</div>
      {sub && <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '11px', marginTop: '5px', fontFamily: MONO }}>{sub}</div>}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'online' ? G : status === 'not_configured' ? GO : R
  const label = status === 'not_configured' ? 'not configured' : status
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
      <span style={{ color, fontSize: '11px', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </span>
  )
}

function FunnelBar({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: MONO }}>{label}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color, fontSize: '13px', fontWeight: 700, fontFamily: MONO }}>{value}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontFamily: MONO, width: '32px', textAlign: 'right' }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.6s ease', boxShadow: `0 0 6px ${color}55` }} />
      </div>
    </div>
  )
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function tierColor(t: string | null) {
  if (t === 'ultra') return '#A87EFF'
  if (t === 'pro') return B
  return 'rgba(255,255,255,0.25)'
}

export default function DevDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [, setTick] = useState(0)

  const load = useCallback(async () => {
    const res = await fetch('/api/dev/stats', { cache: 'no-store' })
    if (res.ok) { setStats(await res.json()); setLastRefresh(new Date()) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const iv = setInterval(() => { load() }, 30_000)
    return () => clearInterval(iv)
  }, [load])
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#030508', color: '#fff', fontFamily: MONO, overflowY: 'auto' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: '1px solid rgba(0,255,133,0.1)',
        background: 'rgba(0,255,133,0.015)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LogoMark size={26} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: G, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>VELQUOR</span>
              <span style={{ background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.2)', borderRadius: '4px', padding: '1px 7px', color: G, fontSize: '9px', letterSpacing: '0.08em' }}>DEV CONSOLE</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', marginTop: '1px' }}>{dateStr}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: G, fontSize: '18px', fontWeight: 700, letterSpacing: '0.04em' }}>{timeStr}</div>
            <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '9px', marginTop: '1px' }}>refresh {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          </div>
          <button onClick={load} style={{ background: 'rgba(0,255,133,0.06)', border: '1px solid rgba(0,255,133,0.18)', borderRadius: '7px', color: G, fontSize: '11px', padding: '7px 14px', cursor: 'pointer', letterSpacing: '0.05em', fontFamily: MONO }}>↻ Refresh</button>
          <button onClick={async () => { await devLogout(); window.location.reload() }} style={{ background: 'rgba(255,51,71,0.06)', border: '1px solid rgba(255,51,71,0.18)', borderRadius: '7px', color: R, fontSize: '11px', padding: '7px 14px', cursor: 'pointer', letterSpacing: '0.05em', fontFamily: MONO }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: G, fontSize: '12px', letterSpacing: '0.1em', opacity: 0.5 }}>Loading console data...</div>
        ) : !stats ? (
          <div style={{ color: R, fontSize: '13px', textAlign: 'center', marginTop: '80px' }}>Failed to load — check Supabase + env vars</div>
        ) : (
          <>
            {/* Row 1 — Key metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <Stat label="Total Users" value={stats.totalUsers} sub="registered" />
              <Stat label="Online Now" value={stats.onlineNow} sub="last 10 min" color={stats.onlineNow > 0 ? G : 'rgba(255,255,255,0.35)'} />
              <Stat label="New Today" value={stats.newToday} sub="last 24h" color={stats.newToday > 0 ? B : 'rgba(255,255,255,0.35)'} />
              <Stat label="New This Week" value={stats.newThisWeek} sub="last 7 days" color={B} />
              <Stat label="Total Trades" value={stats.totalTrades.toLocaleString()} sub="all time" />
              <Stat label="Trades Today" value={stats.tradesToday} sub="last 24h" color={stats.tradesToday > 0 ? G : 'rgba(255,255,255,0.35)'} />
            </div>

            {/* Row 2 — Revenue placeholder + Tier breakdown + Funnel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>

              {/* Revenue — placeholder */}
              <Card title="Revenue (Stripe)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'MRR', value: '€ —' },
                    { label: 'Revenue today', value: '€ —' },
                    { label: 'Churn this month', value: '—' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{r.label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 700 }}>{r.value}</span>
                    </div>
                  ))}
                  <div style={{ color: 'rgba(255,184,48,0.5)', fontSize: '10px', textAlign: 'center', marginTop: '4px', letterSpacing: '0.04em' }}>Connect Stripe to unlock</div>
                </div>
              </Card>

              {/* Tier breakdown */}
              <Card title="Subscription Tiers">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {([
                    { label: 'Free', key: 'free', color: 'rgba(255,255,255,0.35)' },
                    { label: 'Pro', key: 'pro', color: B },
                    { label: 'Ultra', key: 'ultra', color: '#A87EFF' },
                  ] as const).map(tier => {
                    const count = stats.tiers[tier.key]
                    const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0
                    return (
                      <div key={tier.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: tier.color, fontSize: '11px', fontWeight: 600 }}>{tier.label}</span>
                          <span style={{ color: tier.color, fontSize: '12px', fontWeight: 700 }}>{count} <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, fontSize: '10px' }}>({pct}%)</span></span>
                        </div>
                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: tier.color, borderRadius: '2px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* User funnel */}
              <Card title="User Funnel">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <FunnelBar label="Signed up" value={stats.funnel.signedUp} pct={100} color="rgba(255,255,255,0.5)" />
                  <FunnelBar label="Connected MT5" value={stats.funnel.connectedMt5} pct={stats.funnel.connectedPct} color={B} />
                  <FunnelBar label="First trade logged" value={stats.funnel.loggedTrade} pct={stats.funnel.tradedPct} color={G} />
                </div>
              </Card>
            </div>

            {/* Row 3 — At risk + System health + Env + Bridge */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>

              {/* At risk users */}
              <Card title="Users at Risk">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,51,71,0.04)', border: '1px solid rgba(255,51,71,0.1)', borderRadius: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Inactive 7+ days</span>
                    <span style={{ color: stats.atRisk.inactiveWeek > 0 ? R : 'rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: 700 }}>{stats.atRisk.inactiveWeek}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,184,48,0.04)', border: '1px solid rgba(255,184,48,0.1)', borderRadius: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Never connected MT5</span>
                    <span style={{ color: stats.atRisk.neverConnected > 0 ? GO : 'rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: 700 }}>{stats.atRisk.neverConnected}</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px', marginTop: '4px' }}>These users may churn — consider a re-engagement email.</div>
                </div>
              </Card>

              {/* System health */}
              <Card title="System Health">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Supabase DB', status: stats.supabaseStatus },
                    { label: 'Hetzner Bridge', status: stats.bridgeStatus },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{s.label}</span>
                      <StatusDot status={s.status} />
                    </div>
                  ))}
                  {stats.bridgeStatus === 'online' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,255,133,0.03)', borderRadius: '7px', border: '1px solid rgba(0,255,133,0.08)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Live EA connections</span>
                      <span style={{ color: G, fontSize: '12px', fontWeight: 700 }}>{stats.bridgeConnections}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Env vars */}
              <Card title="Environment">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(stats.env).map(([key, ok]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.015)', borderRadius: '6px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{key}</span>
                      <StatusDot status={ok ? 'online' : 'offline'} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Row 4 — Recent signups */}
            <Card title={`Recent Signups (${stats.recentSignups.length})`}>
              {stats.recentSignups.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>No users yet</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '6px' }}>
                  {stats.recentSignups.map((u) => {
                    const isOnline = u.last_seen_at && new Date(u.last_seen_at) > new Date(Date.now() - 10 * 60 * 1000)
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(75,143,255,0.1)', border: '1px solid rgba(75,143,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: B, fontWeight: 700, flexShrink: 0 }}>
                            {(u.email?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email ?? u.id.slice(0, 12)}</div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                              <span style={{ color: tierColor(u.subscription_tier), fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.subscription_tier ?? 'free'}</span>
                              {u.mt5_login && <span style={{ color: G, fontSize: '9px' }}>● MT5</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                          {isOnline && <span style={{ width: 6, height: 6, borderRadius: '50%', background: G, display: 'inline-block', boxShadow: `0 0 5px ${G}` }} />}
                          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', whiteSpace: 'nowrap' }}>{fmt(u.created_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <TodoSection />

            <div style={{ marginTop: '14px', color: 'rgba(255,255,255,0.1)', fontSize: '10px', textAlign: 'right', letterSpacing: '0.03em' }}>
              Server {stats.serverTime} · auto-refresh 30s
            </div>
          </>
        )}
      </div>
    </div>
  )
}
