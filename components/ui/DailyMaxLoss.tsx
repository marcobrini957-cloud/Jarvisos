'use client'

import { useState, useEffect, useMemo } from 'react'
import { Label, Num } from './vq'
import type { Trade } from '@/types'

interface DailyMaxLossProps {
  allRows: Trade[]
}

const STORAGE_KEY = 'velquor-daily-limit'
const DEFAULT_LIMIT = 200

function todayDateStr(): string {
  // Vienna timezone date
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' })
}

export default function DailyMaxLoss({ allRows }: DailyMaxLossProps) {
  const [limit,    setLimit]    = useState<number>(DEFAULT_LIMIT)
  const [editing,  setEditing]  = useState(false)
  const [editVal,  setEditVal]  = useState('')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setLimit(parseFloat(stored) || DEFAULT_LIMIT)
  }, [])

  const todayStr = todayDateStr()

  const todayLoss = useMemo(() => {
    const todayPnl = allRows
      .filter(t => {
        if (!t.close_time || t.symbol === 'BALANCE') return false
        const d = new Date(t.close_time).toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' })
        return d === todayStr
      })
      .reduce((s, t) => s + (t.net_profit ?? 0), 0)
    return Math.min(0, todayPnl) // negative number = loss, 0 = no loss
  }, [allRows, todayStr])

  const lossAmt  = Math.abs(todayLoss)           // positive loss amount
  const pct      = limit > 0 ? Math.min(1, lossAmt / limit) : 0
  const limitHit = lossAmt >= limit
  // A risk gauge is one of the few places amber is a state and not decoration.
  const barColor = pct >= 0.8 ? 'var(--color-down)' : pct >= 0.5 ? 'var(--color-warn)' : 'var(--color-ink-4)'

  function saveLimit() {
    const v = parseFloat(editVal)
    if (!isNaN(v) && v > 0) {
      setLimit(v)
      localStorage.setItem(STORAGE_KEY, String(v))
    }
    setEditing(false)
  }

  function startEdit() {
    setEditVal(String(limit))
    setEditing(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Banner if limit hit */}
      {limitHit && (
        <div style={{
          padding: '8px 12px', borderRadius: 'var(--radius-sm)',
          background: 'var(--color-down-dim)', borderLeft: '2px solid var(--color-down)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
            color: 'var(--color-down)',
          }}>
            Daily limit hit — step away from the charts
          </span>
        </div>
      )}

      {/* Progress row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Daily loss limit</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Num size="sm" style={{ color: lossAmt > 0 ? barColor : 'var(--color-ink-1)' }}>
                €{lossAmt.toFixed(2)}
              </Num>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>/</span>
              {editing ? (
                <input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onBlur={saveLimit}
                  onKeyDown={e => { if (e.key === 'Enter') saveLimit(); if (e.key === 'Escape') setEditing(false) }}
                  className="vq-num"
                  style={{
                    width: '58px', background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-line-3)',
                    borderRadius: 'var(--radius-xs)', padding: '1px 6px',
                    color: 'var(--color-ink-1)', fontSize: 'var(--text-sm)', outline: 'none',
                  }}
                />
              ) : (
                <button onClick={startEdit} className="vq-num" style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)',
                  padding: '0', textDecoration: 'underline dotted',
                }}>
                  €{limit.toFixed(0)}
                </button>
              )}
              <Num size="xs" tone="muted">({(pct * 100).toFixed(0)}%)</Num>
            </div>
          </div>
          <div style={{ height: '3px', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
            <div style={{
              width: `${pct * 100}%`, height: '100%',
              background: barColor,
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
