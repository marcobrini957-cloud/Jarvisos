'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Label, Num, Segmented } from './vq'
import Icon from './Icon'
import { InfoTip } from './InfoTip'
import { suggestDailyLoss } from '@/lib/trading/riskSuggestion'
import type { Trade } from '@/types'

interface DailyMaxLossProps {
  allRows: Trade[]
  /** Account balance — needed to read or set the limit as a percentage. */
  balance?: number | null
}

type Mode = 'amount' | 'percent'

/**
 * The limit used to live only in localStorage, which made it a per-browser
 * setting rather than a per-person one — logging in on a phone gave you back
 * the €200 default and a limit you never chose. It now persists on the profile;
 * the local copy is kept as a first-paint cache so the gauge does not flash the
 * default while the profile request is in flight.
 */
const STORAGE_KEY      = 'velquor-daily-limit'        // legacy: a bare amount
const STORAGE_KEY_MODE = 'velquor-daily-limit-mode'
const DEFAULT_LIMIT    = 200

function todayDateStr(): string {
  // Vienna timezone date
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' })
}

export default function DailyMaxLoss({ allRows, balance = null }: DailyMaxLossProps) {
  const [mode,    setMode]    = useState<Mode>('amount')
  const [value,   setValue]   = useState<number>(DEFAULT_LIMIT)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')

  // First paint from the local cache, then the profile wins.
  useEffect(() => {
    const storedVal  = localStorage.getItem(STORAGE_KEY)
    const storedMode = localStorage.getItem(STORAGE_KEY_MODE)
    if (storedVal)  setValue(parseFloat(storedVal) || DEFAULT_LIMIT)
    if (storedMode === 'percent' || storedMode === 'amount') setMode(storedMode)

    let cancelled = false
    fetch('/api/user/profile')
      .then(r => (r.ok ? r.json() : null))
      .then(p => {
        if (cancelled || !p) return
        if (p.daily_loss_mode === 'percent' || p.daily_loss_mode === 'amount') setMode(p.daily_loss_mode)
        if (typeof p.daily_loss_value === 'number' && p.daily_loss_value > 0) setValue(p.daily_loss_value)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const persist = useCallback((nextMode: Mode, nextValue: number) => {
    localStorage.setItem(STORAGE_KEY, String(nextValue))
    localStorage.setItem(STORAGE_KEY_MODE, nextMode)
    fetch('/api/user/profile', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ daily_loss_mode: nextMode, daily_loss_value: nextValue }),
    }).catch(() => {})
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

  const suggestion = useMemo(() => suggestDailyLoss(allRows, balance), [allRows, balance])

  const usableBalance = balance !== null && balance > 0 ? balance : null

  // A percentage limit only means something once we know the account size.
  const effectiveLimit = mode === 'percent'
    ? (usableBalance ? usableBalance * (value / 100) : 0)
    : value

  const lossAmt  = Math.abs(todayLoss)
  const pct      = effectiveLimit > 0 ? Math.min(1, lossAmt / effectiveLimit) : 0
  const limitHit = effectiveLimit > 0 && lossAmt >= effectiveLimit
  // A risk gauge is one of the few places amber is a state and not decoration.
  const barColor = pct >= 0.8 ? 'var(--color-down)' : pct >= 0.5 ? 'var(--color-warn)' : 'var(--color-ink-4)'

  const commit = useCallback((v: number, nextMode: Mode) => {
    const max = nextMode === 'percent' ? 100 : 1_000_000
    if (!isFinite(v) || v <= 0 || v > max) return
    setValue(v)
    setMode(nextMode)
    persist(nextMode, v)
  }, [persist])

  function saveEdit() {
    commit(parseFloat(editVal.replace(',', '.')), mode)
    setEditing(false)
  }

  function changeMode(next: Mode) {
    if (next === mode) return
    // Carry the limit across rather than resetting it — the number the user
    // already chose is converted into the other unit wherever we can.
    let carried = value
    if (usableBalance) {
      carried = next === 'percent'
        ? +(value / usableBalance * 100).toFixed(2)
        : Math.round(usableBalance * (value / 100))
    } else if (next === 'percent') {
      carried = 2
    }
    if (carried <= 0) carried = next === 'percent' ? 2 : DEFAULT_LIMIT
    commit(carried, next)
  }

  function applySuggestion() {
    if (!suggestion) return
    if (mode === 'percent' && suggestion.pct) commit(suggestion.pct, 'percent')
    else commit(suggestion.amount, 'amount')
  }

  const shownLimit = mode === 'percent'
    ? (usableBalance ? `${value}% · €${effectiveLimit.toFixed(0)}` : `${value}%`)
    : `€${value.toFixed(0)}`

  const suggestLabel = suggestion
    ? (mode === 'percent' && suggestion.pct ? `${suggestion.pct}%` : `€${suggestion.amount}`)
    : ''

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

      {mode === 'percent' && !usableBalance && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warn)' }}>
          Connect MT5 to use a percentage limit — there is no balance to measure against yet.
        </span>
      )}

      {/* Progress row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
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
                  onBlur={saveEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  saveEdit()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  inputMode="decimal"
                  aria-label={mode === 'percent' ? 'Daily loss limit, percent of balance' : 'Daily loss limit, amount'}
                  className="vq-num"
                  style={{
                    width: '58px', background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-line-3)',
                    borderRadius: 'var(--radius-xs)', padding: '1px 6px',
                    color: 'var(--color-ink-1)', fontSize: 'var(--text-sm)', outline: 'none',
                  }}
                />
              ) : (
                <button
                  onClick={() => { setEditVal(String(value)); setEditing(true) }}
                  className="vq-num"
                  title="Edit your daily loss limit"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)',
                    padding: '0', textDecoration: 'underline dotted',
                  }}
                >
                  {shownLimit}
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

          {/* Unit toggle + the data-driven suggestion */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <Segmented
              options={[{ key: 'amount', label: '€' }, { key: 'percent', label: '%' }]}
              value={mode}
              onChange={changeMode}
              titles={{ amount: 'Set a fixed amount', percent: 'Set a share of your balance' }}
            />

            {suggestion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={applySuggestion}
                  title={`Use VELQUOR's suggestion: ${suggestLabel}`}
                  aria-label={`Suggest a daily loss limit from my data: ${suggestLabel}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'none', border: '1px solid var(--color-line-1)',
                    borderRadius: 'var(--radius-xs)', padding: '2px 7px',
                    color: 'var(--color-ink-3)', cursor: 'pointer',
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-ink-1)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-ink-3)' }}
                >
                  <Icon name="spark" size={10} />
                  Suggest
                </button>
                <InfoTip
                  title="Suggested daily loss limit"
                  text={`${suggestion.rationale} Tap Suggest to use ${suggestLabel}.`}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
