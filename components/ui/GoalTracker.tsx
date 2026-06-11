'use client'

import { useState, useEffect } from 'react'

interface GoalTrackerProps {
  monthPnl: number
}

const STORAGE_KEY = 'jarvis-monthly-goal'
const DEFAULT_GOAL = 1500

export default function GoalTracker({ monthPnl }: GoalTrackerProps) {
  const [goal,    setGoal]    = useState<number>(DEFAULT_GOAL)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setGoal(parseFloat(stored) || DEFAULT_GOAL)
  }, [])

  function saveGoal() {
    const v = parseFloat(editVal)
    if (!isNaN(v) && v > 0) {
      setGoal(v)
      localStorage.setItem(STORAGE_KEY, String(v))
    }
    setEditing(false)
  }

  // Pro-rated: how many days through the month vs total days
  const now          = new Date()
  const dayOfMonth   = now.getDate()
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayFraction  = dayOfMonth / daysInMonth
  const proRatedGoal = goal * dayFraction
  const pct          = goal > 0 ? Math.min(1, Math.max(0, monthPnl / goal)) : 0

  // Status vs pro-rated target
  let status: string
  let statusColor: string
  let barColor: string

  if (monthPnl >= goal) {
    status = 'Goal achieved!'
    statusColor = 'var(--gr2)'
    barColor    = 'var(--gr2)'
  } else if (monthPnl >= proRatedGoal * 0.85) {
    status = 'On track'
    statusColor = 'var(--gr2)'
    barColor    = 'var(--gr2)'
  } else if (monthPnl >= proRatedGoal * 0.6) {
    status = 'Slightly behind'
    statusColor = 'var(--am2)'
    barColor    = 'var(--am2)'
  } else {
    status = 'Significantly behind'
    statusColor = 'var(--re)'
    barColor    = 'var(--re)'
  }

  // If negative P&L
  if (monthPnl < 0) {
    status = 'Negative month'
    statusColor = 'var(--re)'
    barColor    = 'var(--re)'
  }

  const label = `€${Math.max(0, monthPnl).toFixed(0)} / €${goal.toFixed(0)} goal (${(pct * 100).toFixed(0)}%) — ${status}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
          Monthly Goal
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>Target:</span>
          {editing ? (
            <input
              autoFocus
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onBlur={saveGoal}
              onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditing(false) }}
              style={{
                width: '68px', background: 'var(--s2)', border: '1px solid var(--ac)',
                borderRadius: '4px', padding: '1px 6px', color: 'var(--t1)', fontSize: '12px', outline: 'none',
              }}
            />
          ) : (
            <button onClick={() => { setEditVal(String(goal)); setEditing(true) }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: 'var(--ac)', fontWeight: 600,
              padding: '0', textDecoration: 'underline dotted',
            }}>
              €{goal.toFixed(0)}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: statusColor, flex: 1 }}>
            {label}
          </span>
        </div>
        <div style={{ position: 'relative', height: '8px', background: 'var(--s3)', borderRadius: '4px', overflow: 'visible' }}>
          {/* Pro-rated marker */}
          <div style={{
            position: 'absolute', top: '-3px', bottom: '-3px',
            left: `${Math.min(100, dayFraction * 100)}%`,
            width: '2px', background: 'rgba(255,255,255,0.25)',
            borderRadius: '1px',
            transform: 'translateX(-50%)',
          }} title={`Today (${dayOfMonth} of ${daysInMonth}, pro-rated €${proRatedGoal.toFixed(0)})`} />

          {/* Fill */}
          <div style={{
            width: `${pct * 100}%`, height: '100%',
            background: barColor, borderRadius: '4px',
            transition: 'width 0.3s ease, background 0.3s ease',
            boxShadow: `0 0 6px ${barColor}55`,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--t3)' }}>€0</span>
          <span style={{ fontSize: '10px', color: 'var(--t3)' }}>
            Day {dayOfMonth}/{daysInMonth}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--t3)' }}>€{goal.toFixed(0)}</span>
        </div>
      </div>
    </div>
  )
}
