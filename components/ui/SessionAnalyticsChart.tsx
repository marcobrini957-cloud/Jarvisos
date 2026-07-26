'use client'

import { useEffect, useState } from 'react'
import { Label, Num, Segmented } from './vq'

interface SessionRow {
  name: string; key: string
  wins: number; losses: number; be: number; total: number
  pnl: number; pips: number; wr: number
}
interface SymbolRow {
  symbol: string
  wins: number; losses: number; total: number
  pnl: number; pips: number; wr: number
}
interface DirRow {
  dir: string; wins: number; losses: number; total: number; pnl: number; wr: number
}
interface Analytics { sessions: SessionRow[]; symbols: SymbolRow[]; directions: DirRow[] }

// Sessions are told apart by name and by how bright the marker is, not by hue.
const SESSION_INK: Record<string, string> = {
  london:   'var(--color-ink-1)',
  new_york: 'var(--color-ink-2)',
  asian:    'var(--color-ink-3)',
  unknown:  'var(--color-ink-4)',
}

function fmt(n: number) {
  return `${n >= 0 ? '+' : ''}€${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function WinBar({ wr }: { wr: number; wins: number; losses: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '3px', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
        <div style={{
          width: `${wr}%`, height: '100%',
          background: wr >= 50 ? 'var(--color-up)' : 'var(--color-down)',
          transition: 'width 0.4s ease',
        }} />
      </div>
      <Num size="xs" tone={wr >= 50 ? 'up' : 'down'} style={{ minWidth: '32px', textAlign: 'right' }}>{wr}%</Num>
    </div>
  )
}

type Tab = 'sessions' | 'symbols' | 'direction'

export default function SessionAnalyticsChart() {
  const [data,    setData]    = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<Tab>('sessions')

  useEffect(() => {
    fetch('/api/trades/analytics')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: 'var(--text-base)' }}>Loading…</div>

  const noData = !data || (data.sessions.length === 0 && data.symbols.length === 0)
  if (noData) return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: 'var(--text-base)' }}>
      Analytics appear once you have closed trades.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="self-start">
        <Segmented
          options={[
            { key: 'sessions',  label: 'Session' },
            { key: 'symbols',   label: 'Symbol' },
            { key: 'direction', label: 'Buy / Sell' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {/* Sessions */}
      {tab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {data!.sessions.map(s => (
            <div key={s.key} style={{
              padding: '9px 12px', background: 'var(--color-surface-1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: SESSION_INK[s.key] ?? 'var(--color-ink-4)' }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-1)' }}>{s.name}</span>
                  <Num size="xs" tone="muted">{s.total} trades</Num>
                </div>
                <Num size="sm" value={s.pnl} tone="auto">{fmt(s.pnl)}</Num>
              </div>
              <WinBar wr={s.wr} wins={s.wins} losses={s.losses} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <Num size="2xs" tone="up">{s.wins}W</Num>
                <Num size="2xs" tone="down">{s.losses}L</Num>
                {s.be > 0 && <Num size="2xs" tone="muted">{s.be} BE</Num>}
                <Num size="2xs" tone="muted">{s.pips > 0 ? '+' : ''}{s.pips} pips</Num>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Symbols */}
      {tab === 'symbols' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data!.symbols.map(s => {
            const maxPnl = Math.max(...data!.symbols.map(x => Math.abs(x.pnl)), 1)
            return (
              <div key={s.symbol}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Num size="sm" tone="neutral" style={{ minWidth: '72px' }}>{s.symbol}</Num>
                    <Num size="2xs" tone="muted">{s.total} trades · {s.wr}% WR</Num>
                  </div>
                  <Num size="sm" value={s.pnl} tone="auto">{fmt(s.pnl)}</Num>
                </div>
                <div style={{ height: '3px', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(Math.abs(s.pnl) / maxPnl) * 100}%`,
                    height: '100%',
                    background: s.pnl >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Direction */}
      {tab === 'direction' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {data!.directions.map(d => (
            <div key={d.dir} style={{
              padding: '11px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-line-1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
                <Num size="sm" tone={d.dir === 'buy' ? 'up' : 'down'}>{d.dir === 'buy' ? '↑' : '↓'}</Num>
                <Label>{d.dir}</Label>
              </div>
              <div style={{ marginBottom: '7px' }}>
                <Num size="xl" value={d.pnl} tone="auto">{fmt(d.pnl)}</Num>
              </div>
              <WinBar wr={d.wr} wins={d.wins} losses={d.losses} />
              <div style={{ marginTop: '6px' }}>
                <Num size="2xs" tone="muted">{d.wins}W · {d.losses}L · {d.total} trades</Num>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
