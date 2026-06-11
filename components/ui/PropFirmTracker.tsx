'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Trade } from '@/types'

interface PropFirmConfig {
  enabled:          boolean
  accountSize:      number
  maxDailyLossPct:  number
  maxTotalDDPct:    number
  profitTargetPct:  number
  minTradingDays:   number
  startingBalance:  number
}

interface PropFirmTrackerProps {
  trades:      Trade[]
  allRows:     Trade[]
  balance:     number
}

const STORAGE_KEY = 'jarvis-prop-firm'

const DEFAULT_CONFIG: PropFirmConfig = {
  enabled:          false,
  accountSize:      10000,
  maxDailyLossPct:  5,
  maxTotalDDPct:    10,
  profitTargetPct:  10,
  minTradingDays:   10,
  startingBalance:  10000,
}

function todayStr(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' })
}

function ProgressBar({ label, current, max, color, invert = false }: {
  label:   string
  current: number
  max:     number
  color:   string
  invert?: boolean  // for drawdown: lower is better
}) {
  const pct = max > 0 ? Math.min(1, Math.abs(current) / max) : 0
  const barColor = invert
    ? (pct >= 0.9 ? 'var(--re)' : pct >= 0.6 ? 'var(--am2)' : 'var(--gr2)')
    : (pct >= 0.9 ? 'var(--gr2)' : pct >= 0.5 ? 'var(--am2)' : 'var(--t2)')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{label}</span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: barColor }}>
          {current >= 0 ? '' : '-'}€{Math.abs(current).toFixed(0)} / €{max.toFixed(0)} ({(pct * 100).toFixed(0)}%)
        </span>
      </div>
      <div style={{ height: '5px', background: 'var(--s3)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%',
          background: barColor, borderRadius: '3px',
          transition: 'width 0.3s ease',
          boxShadow: `0 0 4px ${barColor}66`,
        }} />
      </div>
    </div>
  )
}

export default function PropFirmTracker({ trades, allRows, balance }: PropFirmTrackerProps) {
  const [config,  setConfig]  = useState<PropFirmConfig>(DEFAULT_CONFIG)
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState<PropFirmConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PropFirmConfig
        setConfig(parsed)
        setDraft(parsed)
      } catch { /* ignore */ }
    }
  }, [])

  function saveConfig() {
    setConfig(draft)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    setEditing(false)
  }

  const today = todayStr()
  const realTrades = useMemo(() =>
    trades.filter(t => t.symbol !== 'BALANCE'),
  [trades])

  const todayLoss = useMemo(() => {
    const pnl = allRows
      .filter(t => {
        if (!t.close_time || t.symbol === 'BALANCE') return false
        return new Date(t.close_time).toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' }) === today
      })
      .reduce((s, t) => s + (t.net_profit ?? 0), 0)
    return Math.min(0, pnl) // negative = loss
  }, [allRows, today])

  const totalDD = config.startingBalance > 0
    ? Math.max(0, config.startingBalance - balance)
    : 0

  const currentProfit = balance - config.startingBalance

  // Count unique trading days (days with at least 1 closed trade)
  const tradingDays = useMemo(() => {
    const days = new Set<string>()
    for (const t of realTrades) {
      if (t.close_time) {
        days.add(new Date(t.close_time).toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' }))
      }
    }
    return days.size
  }, [realTrades])

  const maxDailyLossEur = config.accountSize * config.maxDailyLossPct / 100
  const maxTotalDDEur   = config.accountSize * config.maxTotalDDPct   / 100
  const profitTargetEur = config.accountSize * config.profitTargetPct / 100

  if (!config.enabled) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
            Prop Firm Challenge
          </span>
          <button
            onClick={() => { setDraft({ ...config, enabled: true }); setEditing(true) }}
            style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: '5px',
              background: 'var(--s3)', border: '1px solid var(--bd2)',
              color: 'var(--ac)', cursor: 'pointer',
            }}
          >
            Enable
          </button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--t3)' }}>
          Not enabled. Click Enable to track prop firm challenge rules.
        </p>
      </div>
    )
  }

  const inputSt: React.CSSProperties = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)',
    borderRadius: '6px', padding: '5px 8px', color: 'var(--t1)', fontSize: '12px', outline: 'none',
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
          Prop Firm — Configure
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {([
            { label: 'Account Size (€)',    key: 'accountSize'     },
            { label: 'Starting Balance (€)',key: 'startingBalance' },
            { label: 'Max Daily Loss (%)',  key: 'maxDailyLossPct' },
            { label: 'Max Total DD (%)',    key: 'maxTotalDDPct'   },
            { label: 'Profit Target (%)',   key: 'profitTargetPct' },
            { label: 'Min Trading Days',    key: 'minTradingDays'  },
          ] as { label: string; key: keyof PropFirmConfig }[]).map(f => (
            <div key={f.key}>
              <label style={{ color: 'var(--t3)', fontSize: '10px', display: 'block', marginBottom: '3px' }}>{f.label}</label>
              <input
                value={String(draft[f.key])}
                onChange={e => setDraft(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                style={inputSt}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--ac)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--bd2)')}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={saveConfig}
            style={{ flex: 1, padding: '7px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'var(--ac)', color: 'white', fontSize: '12px', fontWeight: 600 }}>
            Save
          </button>
          <button onClick={() => { setConfig(prev => ({ ...prev, enabled: false })); localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, enabled: false })); setEditing(false) }}
            style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--bd2)', cursor: 'pointer', background: 'transparent', color: 'var(--re)', fontSize: '12px' }}>
            Disable
          </button>
          <button onClick={() => setEditing(false)}
            style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--bd2)', cursor: 'pointer', background: 'transparent', color: 'var(--t3)', fontSize: '12px' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
          Prop Firm Challenge — €{config.accountSize.toLocaleString()}
        </span>
        <button onClick={() => { setDraft(config); setEditing(true) }}
          style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'var(--s3)', border: '1px solid var(--bd2)', color: 'var(--t3)', cursor: 'pointer' }}>
          Edit
        </button>
      </div>

      <ProgressBar
        label="Daily Loss"
        current={Math.abs(todayLoss)}
        max={maxDailyLossEur}
        color="var(--re)"
        invert
      />
      <ProgressBar
        label="Total Drawdown"
        current={totalDD}
        max={maxTotalDDEur}
        color="var(--re)"
        invert
      />
      <ProgressBar
        label="Profit Target"
        current={Math.max(0, currentProfit)}
        max={profitTargetEur}
        color="var(--gr2)"
        invert={false}
      />

      {/* Trading days */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>Trading Days</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: tradingDays >= config.minTradingDays ? 'var(--gr2)' : 'var(--am2)' }}>
            {tradingDays} / {config.minTradingDays} days
          </span>
        </div>
        <div style={{ height: '5px', background: 'var(--s3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, (tradingDays / config.minTradingDays) * 100)}%`,
            height: '100%', borderRadius: '3px',
            background: tradingDays >= config.minTradingDays ? 'var(--gr2)' : 'var(--am2)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    </div>
  )
}
