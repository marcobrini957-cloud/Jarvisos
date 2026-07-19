'use client'

import { useEffect, useMemo, useState } from 'react'
import { computeBreakdowns } from '@/lib/trading/breakdowns'
import type { Trade } from '@/types'

interface FFEvent {
  title:    string
  time:     string
  date:     string
  currency: string
  forecast: string
  previous: string
}

interface FocusItem {
  tone:  'warn' | 'info' | 'good'
  title: string
  body:  string
}

const TONE = {
  warn: { color: 'var(--re)',  bg: 'rgba(255,61,80,0.07)',  bd: 'rgba(255,61,80,0.18)'  },
  info: { color: 'var(--ac)',  bg: 'rgba(88,166,255,0.06)', bd: 'rgba(88,166,255,0.16)' },
  good: { color: 'var(--gr2)', bg: 'rgba(0,232,122,0.06)',  bd: 'rgba(0,232,122,0.16)'  },
} as const

function eventCountdown(e: FFEvent): string | null {
  const at = new Date(`${e.date}`)
  if (isNaN(at.getTime())) return null
  const mins = Math.round((at.getTime() - Date.now()) / 60000)
  if (mins < -30) return null           // long past
  if (mins <= 0) return 'now'
  if (mins < 60) return `in ${mins}m`
  return `in ${Math.floor(mins / 60)}h ${mins % 60}m`
}

// Today's Focus — concrete, database-driven guidance for the session:
// red-folder news to avoid + this account's own loss patterns.
export function TodaysFocus({ allRows }: { allRows: Trade[] }) {
  const [events, setEvents] = useState<FFEvent[]>([])

  useEffect(() => {
    fetch('/api/macro')
      .then(r => r.json())
      .then(d => setEvents(d.todayHighImpact ?? []))
      .catch(() => {})
  }, [])

  const items = useMemo<FocusItem[]>(() => {
    const out: FocusItem[] = []
    const b = computeBreakdowns(allRows)
    const todayDow  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
    const todayFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]

    // 1. Red-folder news still ahead today
    const upcoming = events
      .map(e => ({ e, cd: eventCountdown(e) }))
      .filter(x => x.cd !== null)
      .slice(0, 2)
    for (const { e, cd } of upcoming) {
      out.push({
        tone:  'warn',
        title: `${e.time} — ${e.title} (${e.currency})`,
        body:  `High-impact news ${cd}. Spreads widen and stops get hunted — consider staying flat 15 min either side.`,
      })
    }

    // 2. Today's weekday — only if the data says it's a problem or an edge
    const dow = b.byDayOfWeek.find(s => s.key === todayDow)
    if (dow && dow.trades >= 5) {
      if (dow.netPnl < 0) {
        out.push({
          tone:  'warn',
          title: `${todayFull}s cost you money`,
          body:  `€${dow.netPnl.toFixed(0)} over ${dow.trades} trades (${dow.winRate.toFixed(0)}% win rate). Size down or demand A+ setups today.`,
        })
      } else if (dow.winRate >= 55) {
        out.push({
          tone:  'good',
          title: `${todayFull} is one of your better days`,
          body:  `+€${dow.netPnl.toFixed(0)} over ${dow.trades} trades (${dow.winRate.toFixed(0)}% win rate). Trade your plan.`,
        })
      }
    }

    // 3. Best hour window
    const goodHours = [...b.byHour].filter(s => s.trades >= 4).sort((a, c) => c.netPnl - a.netPnl)
    if (goodHours.length > 0 && goodHours[0].netPnl > 0) {
      const h = Number(goodHours[0].key)
      out.push({
        tone:  'info',
        title: `Your edge window: ${String(h).padStart(2, '0')}:00–${String((h + 1) % 24).padStart(2, '0')}:00`,
        body:  `+€${goodHours[0].netPnl.toFixed(0)} across ${goodHours[0].trades} entries — your most profitable entry hour.`,
      })
    }

    // 4. The single most damaging pattern in the data
    if (b.worstCombo && b.worstCombo.netPnl < 0) {
      out.push({
        tone:  'warn',
        title: 'Pattern to avoid',
        body:  `${b.worstCombo.label}: €${b.worstCombo.netPnl.toFixed(0)} over ${b.worstCombo.trades} trades (${b.worstCombo.winRate.toFixed(0)}% win rate).`,
      })
    }

    if (out.length === 0) {
      out.push({
        tone:  'info',
        title: 'No red-folder news, no red flags',
        body:  'Clean session ahead. Your only job is to follow the plan.',
      })
    }
    return out.slice(0, 4)
  }, [allRows, events])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((it, i) => {
        const t = TONE[it.tone]
        return (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: '9px',
            background: t.bg, border: `1px solid ${t.bd}`,
          }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: t.color, margin: 0, marginBottom: '3px' }}>
              {it.title}
            </p>
            <p style={{ fontSize: '11.5px', color: 'var(--t2)', lineHeight: 1.5, margin: 0 }}>
              {it.body}
            </p>
          </div>
        )
      })}
    </div>
  )
}
