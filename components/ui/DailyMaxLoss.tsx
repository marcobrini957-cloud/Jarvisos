'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Trade } from '@/types'

interface DailyMaxLossProps {
  allRows: Trade[]
}

const STORAGE_KEY = 'jarvis-daily-limit'
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
  const barColor = pct >= 0.8 ? 'var(--re)' : pct >= 0.5 ? 'var(--am2)' : 'var(--gr2)'

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
          padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(255,51,71,0.12)', border: '1px solid rgba(255,51,71,0.35)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>⛔</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--re)' }}>
            Daily limit hit — step away from the charts
          </span>
        </div>
      )}

      {/* Progress row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
              Daily Loss Limit
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: barColor }}>
                €{lossAmt.toFixed(2)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--t3)' }}>/</span>
              {editing ? (
                <input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onBlur={saveLimit}
                  onKeyDown={e => { if (e.key === 'Enter') saveLimit(); if (e.key === 'Escape') setEditing(false) }}
                  style={{
                    width: '60px', background: 'var(--s2)', border: '1px solid var(--ac)',
                    borderRadius: '4px', padding: '1px 6px', color: 'var(--t1)', fontSize: '12px', outline: 'none',
                  }}
                />
              ) : (
                <button onClick={startEdit} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: 'var(--t2)', fontWeight: 600,
                  padding: '0', textDecoration: 'underline dotted',
                }}>
                  €{limit.toFixed(0)}
                </button>
              )}
              <span style={{ fontSize: '11px', color: 'var(--t3)' }}>({(pct * 100).toFixed(0)}%)</span>
            </div>
          </div>
          <div style={{ height: '6px', background: 'var(--s3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${pct * 100}%`, height: '100%',
              background: barColor, borderRadius: '3px',
              transition: 'width 0.3s ease, background 0.3s ease',
              boxShadow: pct >= 0.5 ? `0 0 6px ${barColor}66` : 'none',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}
