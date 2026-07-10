'use client'
import { useEffect, useState, useCallback } from 'react'
import { devLogout } from './actions'
import { LogoMark } from '@/components/ui/LogoMark'

type Stats = {
  totalUsers: number
  onlineNow: number
  newToday: number
  newThisWeek: number
  totalTrades: number
  tradesToday: number
  recentSignups: { id: string; email: string; created_at: string; last_seen_at: string | null; subscription_tier: string | null }[]
  recentTrades: { id: string; symbol: string; net_profit: number; created_at: string; user_id: string }[]
  bridgeStatus: string
  supabaseStatus: string
  serverTime: string
  env: Record<string, boolean>
}

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
const G = '#00FF85'
const R = '#FF3347'
const B = '#4B8FFF'

function Stat({ label, value, sub, color = '#fff' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', padding: '20px 22px',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: MONO }}>{label}</div>
      <div style={{ color, fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, fontFamily: MONO }}>{value}</div>
      {sub && <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '6px', fontFamily: MONO }}>{sub}</div>}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'online' ? G : status === 'not_configured' ? '#FFB830' : R
  const label = status === 'not_configured' ? 'not configured' : status
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
      <span style={{ color, fontSize: '11px', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </span>
  )
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function DevDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [tick, setTick] = useState(0)

  const load = useCallback(async () => {
    const res = await fetch('/api/dev/stats', { cache: 'no-store' })
    if (res.ok) {
      setStats(await res.json())
      setLastRefresh(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const iv = setInterval(() => { load(); setTick(t => t + 1) }, 30_000)
    return () => clearInterval(iv)
  }, [load])

  // Clock tick
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#030508', color: '#fff', fontFamily: MONO }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: '1px solid rgba(0,255,133,0.1)',
        background: 'rgba(0,255,133,0.02)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LogoMark size={26} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: G, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>VELQUOR</span>
              <span style={{ background: 'rgba(0,255,133,0.1)', border: '1px solid rgba(0,255,133,0.25)', borderRadius: '4px', padding: '1px 7px', color: G, fontSize: '9px', letterSpacing: '0.08em' }}>DEV CONSOLE</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '1px' }}>{dateStr}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: G, fontSize: '18px', fontWeight: 700, letterSpacing: '0.04em' }}>{timeStr}</div>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', marginTop: '1px' }}>
              last refresh {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
          <button
            onClick={load}
            style={{ background: 'rgba(0,255,133,0.06)', border: '1px solid rgba(0,255,133,0.2)', borderRadius: '7px', color: G, fontSize: '11px', padding: '7px 14px', cursor: 'pointer', letterSpacing: '0.05em' }}
          >↻ Refresh</button>
          <button
            onClick={async () => { await devLogout(); window.location.reload() }}
            style={{ background: 'rgba(255,51,71,0.06)', border: '1px solid rgba(255,51,71,0.2)', borderRadius: '7px', color: R, fontSize: '11px', padding: '7px 14px', cursor: 'pointer', letterSpacing: '0.05em' }}
          >Logout</button>
        </div>
      </div>

      <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: G, fontSize: '13px', letterSpacing: '0.1em' }}>
            Loading console...
          </div>
        ) : stats ? (
          <>
            {/* Key metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <Stat label="Total Users" value={stats.totalUsers} sub="all time" color="#fff" />
              <Stat label="Online Now" value={stats.onlineNow} sub="last 10 min" color={stats.onlineNow > 0 ? G : 'rgba(255,255,255,0.4)'} />
              <Stat label="New Today" value={stats.newToday} sub="last 24h" color={stats.newToday > 0 ? B : 'rgba(255,255,255,0.4)'} />
              <Stat label="New This Week" value={stats.newThisWeek} sub="last 7 days" color={B} />
              <Stat label="Total Trades" value={stats.totalTrades.toLocaleString()} sub="all time" color="#fff" />
              <Stat label="Trades Today" value={stats.tradesToday} sub="last 24h" color={stats.tradesToday > 0 ? G : 'rgba(255,255,255,0.4)'} />
            </div>

            {/* System Health + Env */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>System Health</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'Supabase', status: stats.supabaseStatus },
                    { label: 'Hetzner Bridge', status: stats.bridgeStatus },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', letterSpacing: '0.04em' }}>{s.label}</span>
                      <StatusDot status={s.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Environment</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(stats.env).map(([key, ok]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '0.04em' }}>{key}</span>
                      <StatusDot status={ok ? 'online' : 'offline'} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent signups + Recent trades */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Recent Signups</div>
                {stats.recentSignups.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>No users yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {stats.recentSignups.map((u, i) => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(75,143,255,0.15)', border: '1px solid rgba(75,143,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: B, fontWeight: 700, flexShrink: 0 }}>
                            {(u.email?.[0] ?? '?').toUpperCase()}
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email ?? u.id.slice(0, 8)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                          {u.last_seen_at && new Date(u.last_seen_at) > new Date(Date.now() - 10 * 60 * 1000) && (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: G, display: 'inline-block', boxShadow: `0 0 5px ${G}` }} title="Online now" />
                          )}
                          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', whiteSpace: 'nowrap' }}>{fmt(u.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 22px' }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Recent Trades Logged</div>
                {stats.recentTrades.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>No trades yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {stats.recentTrades.map((t, i) => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: (t.net_profit ?? 0) >= 0 ? 'rgba(0,255,133,0.1)' : 'rgba(255,51,71,0.1)', color: (t.net_profit ?? 0) >= 0 ? G : R }}>
                            {(t.net_profit ?? 0) >= 0 ? '+' : ''}€{(t.net_profit ?? 0).toFixed(0)}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px' }}>{t.symbol}</span>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>{fmt(t.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '16px', color: 'rgba(255,255,255,0.1)', fontSize: '10px', textAlign: 'right', letterSpacing: '0.04em' }}>
              Server time: {stats.serverTime} · Auto-refreshes every 30s
            </div>
          </>
        ) : (
          <div style={{ color: R, fontSize: '13px', textAlign: 'center', marginTop: '80px' }}>Failed to load stats — check console</div>
        )}
      </div>
    </div>
  )
}
