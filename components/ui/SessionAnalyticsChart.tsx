'use client'

import { useEffect, useState } from 'react'

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

const SESSION_COLOR: Record<string, string> = {
  london:   'var(--ac)',
  new_york: 'var(--gr2)',
  asian:    'var(--pu)',
  unknown:  'var(--t3)',
}

function fmt(n: number) {
  return `${n >= 0 ? '+' : ''}€${Math.abs(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function WinBar({ wr, wins, losses }: { wr: number; wins: number; losses: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: 'var(--s3)', overflow: 'hidden' }}>
        <div style={{ width: `${wr}%`, height: '100%', background: wr >= 50 ? 'var(--gr2)' : 'var(--re)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color: wr >= 50 ? 'var(--gr2)' : 'var(--re)', minWidth: '34px', textAlign: 'right' }}>{wr}%</span>
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

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
        background: tab === id ? 'var(--ac)' : 'transparent',
        border: tab === id ? 'none' : '1px solid var(--bd2)',
        color: tab === id ? 'white' : 'var(--t3)',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
    >{label}</button>
  )

  if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)', fontSize: '12px' }}>Loading…</div>

  const noData = !data || (data.sessions.length === 0 && data.symbols.length === 0)
  if (noData) return (
    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--t3)', fontSize: '12px' }}>
      Analytics appear once you have closed trades.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {tabBtn('sessions',  'By Session')}
        {tabBtn('symbols',   'By Symbol')}
        {tabBtn('direction', 'Buy vs Sell')}
      </div>

      {/* Sessions */}
      {tab === 'sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data!.sessions.map(s => (
            <div key={s.key} style={{
              padding: '12px 14px', borderRadius: '10px',
              background: 'var(--s2)', border: '1px solid var(--bd2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: SESSION_COLOR[s.key] ?? 'var(--t3)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{s.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{s.total} trades</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: s.pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{fmt(s.pnl)}</span>
              </div>
              <WinBar wr={s.wr} wins={s.wins} losses={s.losses} />
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--gr2)' }}>{s.wins}W</span>
                <span style={{ fontSize: '10px', color: 'var(--re)' }}>{s.losses}L</span>
                {s.be > 0 && <span style={{ fontSize: '10px', color: 'var(--t3)' }}>{s.be} BE</span>}
                <span style={{ fontSize: '10px', color: 'var(--t3)' }}>{s.pips > 0 ? '+' : ''}{s.pips} pips</span>
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
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', minWidth: '72px' }}>{s.symbol}</span>
                    <span style={{ fontSize: '10px', color: 'var(--t3)' }}>{s.total} trades · {s.wr}% WR</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: s.pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{fmt(s.pnl)}</span>
                </div>
                <div style={{ height: '4px', borderRadius: '2px', background: 'var(--s3)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(Math.abs(s.pnl) / maxPnl) * 100}%`,
                    height: '100%',
                    background: s.pnl >= 0 ? 'var(--gr2)' : 'var(--re)',
                    borderRadius: '2px',
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
              padding: '16px', borderRadius: '12px',
              background: d.dir === 'buy' ? 'rgba(0,232,122,0.06)' : 'rgba(77,143,255,0.06)',
              border: `1px solid ${d.dir === 'buy' ? 'rgba(0,232,122,0.18)' : 'rgba(77,143,255,0.18)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '16px' }}>{d.dir === 'buy' ? '↑' : '↓'}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)', textTransform: 'capitalize' }}>{d.dir}</span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em', color: d.pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{fmt(d.pnl)}</p>
              <WinBar wr={d.wr} wins={d.wins} losses={d.losses} />
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'var(--t3)' }}>{d.wins}W · {d.losses}L · {d.total} trades</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
