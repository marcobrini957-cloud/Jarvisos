'use client'

import Panel from '@/components/ui/Panel'
import { Label, Num } from '@/components/ui/vq'
import type { Trade } from '@/types'
import { useClassifier } from '@/context/UserProfileContext'

// ── Your Edge Panel ───────────────────────────────────────────────────────────

export function YourEdge({ trades }: { trades: Trade[] }) {
  const { isWin, isLoss } = useClassifier()
  const closed = trades.filter(t => t.net_profit !== null && t.symbol !== 'BALANCE')
  if (closed.length < 10) return null

  // No icon field any more: the emoji row (calendar, clock, chart, tick) read as
  // a sticker sheet next to the numbers, and the label already says what it is.
  type Edge = { label: string; value: string; sub: string; color: string }
  const edges: Edge[] = []

  // Helper
  const wrOf = (ts: Trade[]) => {
    const w = ts.filter(t => isWin(t)).length
    const l = ts.filter(t => isLoss(t)).length
    return (w + l) > 0 ? { wr: (w / (w + l)) * 100, trades: ts.length, w, l } : null
  }
  const avgPnl = (ts: Trade[]) => ts.reduce((s, t) => s + (t.net_profit ?? 0), 0) / (ts.length || 1)

  // Best day of week
  const byDay: Record<number, Trade[]> = {}
  for (const t of closed) {
    if (!t.close_time) continue
    const d = new Date(t.close_time).getDay()
    if (d === 0 || d === 6) continue
    ;(byDay[d] ??= []).push(t)
  }
  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  let bestDay = { wr: 0, day: '', avg: 0, n: 0 }
  for (const [d, ts] of Object.entries(byDay)) {
    const r = wrOf(ts)
    if (r && r.wr > bestDay.wr && r.trades >= 3) {
      bestDay = { wr: r.wr, day: dayNames[Number(d)], avg: avgPnl(ts), n: r.trades }
    }
  }
  if (bestDay.day) edges.push({
    label: `Best day: ${bestDay.day}`,
    value: `${bestDay.wr.toFixed(0)}% WR`,
    sub: `avg ${bestDay.avg >= 0 ? '+' : ''}€${bestDay.avg.toFixed(0)} · ${bestDay.n} trades`,
    color: 'var(--color-ink-1)',
  })

  // Best session
  const sessions = [
    { key: 'london',   label: 'London session' },
    { key: 'new_york', label: 'New York session' },
    { key: 'overlap',  label: 'London/NY overlap' },
  ]
  let bestSession = { wr: 0, label: '', avg: 0, n: 0 }
  for (const s of sessions) {
    const ts = closed.filter(t => t.session === s.key)
    const r = wrOf(ts)
    if (r && r.wr > bestSession.wr && r.trades >= 3) {
      bestSession = { wr: r.wr, label: s.label, avg: avgPnl(ts), n: r.trades }
    }
  }
  if (bestSession.label) edges.push({
    label: bestSession.label,
    value: `${bestSession.wr.toFixed(0)}% WR`,
    sub: `avg ${bestSession.avg >= 0 ? '+' : ''}€${bestSession.avg.toFixed(0)} · ${bestSession.n} trades`,
    color: 'var(--color-ink-1)',
  })

  // Best instrument
  const instruments = [
    { keys: ['XAU'],           label: 'XAUUSD' },
    { keys: ['NAS', 'US100'],  label: 'NAS100' },
  ]
  let bestInst = { wr: 0, label: '', avg: 0, n: 0 }
  for (const inst of instruments) {
    const ts = closed.filter(t => inst.keys.some(k => t.symbol?.includes(k)))
    const r = wrOf(ts)
    if (r && r.wr > bestInst.wr && r.trades >= 3) {
      bestInst = { wr: r.wr, label: inst.label, avg: avgPnl(ts), n: r.trades }
    }
  }
  if (bestInst.label) edges.push({
    label: `Best instrument: ${bestInst.label}`,
    value: `${bestInst.wr.toFixed(0)}% WR`,
    sub: `avg ${bestInst.avg >= 0 ? '+' : ''}€${bestInst.avg.toFixed(0)} · ${bestInst.n} trades`,
    color: 'var(--color-ink-1)',
  })

  // Plan adherence edge
  const withPlan    = closed.filter(t => t.followed_plan === true)
  const withoutPlan = closed.filter(t => t.followed_plan === false)
  if (withPlan.length >= 3 && withoutPlan.length >= 3) {
    const planPnl    = avgPnl(withPlan)
    const noPlanPnl  = avgPnl(withoutPlan)
    const diff       = planPnl - noPlanPnl
    if (Math.abs(diff) > 20) edges.push({
      label: diff > 0 ? 'Following your plan pays' : 'Breaking plan is costly',
      value: diff > 0 ? `+€${diff.toFixed(0)} avg` : `-€${Math.abs(diff).toFixed(0)} avg`,
      sub: `plan: €${planPnl.toFixed(0)} · no plan: €${noPlanPnl.toFixed(0)}`,
      color: diff > 0 ? 'var(--color-up)' : 'var(--color-down)',
    })
  }

  // Loss streak warning
  let streak = 0
  for (const t of [...closed].reverse()) {
    if (isLoss(t)) streak++
    else if (isWin(t)) break
  }
  if (streak >= 3) edges.push({
    label: `${streak}-trade loss streak`,
    value: 'Take a break',
    sub: 'History shows WR drops 40% after 3 consecutive losses',
    color: 'var(--color-down)',
  })

  if (edges.length === 0) return null

  return (
    <Panel title="Your edge — what the data says" noPadding>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        {edges.map((e, i) => (
          <div key={i} style={{
            padding: '10px 14px',
            borderRight: '1px solid var(--color-line-1)',
            display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0,
          }}>
            <Label>{e.label}</Label>
            <Num size="xl" style={{ color: e.color }}>{e.value}</Num>
            <Num size="2xs" tone="muted">{e.sub}</Num>
          </div>
        ))}
      </div>
    </Panel>
  )
}
