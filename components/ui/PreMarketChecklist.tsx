'use client'

import { useState, useEffect } from 'react'

const ITEMS = [
  'Checked economic calendar for today',
  'Defined bullish/bearish bias for XAUUSD',
  'Defined bullish/bearish bias for NAS100',
  'Set SL and TP levels before entering',
  'No high-impact news in the next 30 min',
  'Within daily loss limit',
]

function todayKey(): string {
  const d = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' })
  return `velquor-checklist-${d}`
}

export default function PreMarketChecklist() {
  const [checked, setChecked] = useState<boolean[]>(Array(ITEMS.length).fill(false))

  useEffect(() => {
    const stored = localStorage.getItem(todayKey())
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as boolean[]
        if (Array.isArray(parsed) && parsed.length === ITEMS.length) {
          setChecked(parsed)
          return
        }
      } catch { /* ignore */ }
    }
    setChecked(Array(ITEMS.length).fill(false))
  }, [])

  function toggle(i: number) {
    setChecked(prev => {
      const next = [...prev]
      next[i] = !next[i]
      localStorage.setItem(todayKey(), JSON.stringify(next))
      return next
    })
  }

  const done  = checked.filter(Boolean).length
  const total = ITEMS.length
  const allDone = done === total

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
          Pre-Market Checklist
        </span>
        {allDone ? (
          <span style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--gr2)',
            background: 'rgba(0,232,122,0.1)', padding: '2px 8px', borderRadius: '4px',
            border: '1px solid rgba(0,232,122,0.25)',
          }}>
            ✓ Ready to trade
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
            {done}/{total} complete
          </span>
        )}
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {ITEMS.map((item, i) => (
          <button key={i} onClick={() => toggle(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '5px 6px', borderRadius: '6px',
              textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {/* Checkbox */}
            <div style={{
              width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
              background: checked[i] ? 'var(--gr)' : 'transparent',
              border: `2px solid ${checked[i] ? 'var(--gr2)' : 'var(--bd2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: checked[i] ? '0 0 8px rgba(0,232,122,0.4)' : 'none',
              transition: 'all 0.12s',
            }}>
              {checked[i] && <span style={{ fontSize: '9px', color: 'white', fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{
              fontSize: '12px',
              color: checked[i] ? 'var(--t3)' : 'var(--t2)',
              textDecoration: checked[i] ? 'line-through' : 'none',
              lineHeight: 1.4,
            }}>
              {item}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
