'use client'
import { useCallback, useEffect, useState } from 'react'
import { MONO, G, R, B, GO, P, Card, Stat, StatusDot, fmtDate, tierColor } from '../ui'

type Stats = {
  totalUsers: number
  onlineNow: number
  newToday: number
  newThisWeek: number
  totalTrades: number
  tradesToday: number
  tiers: { free: number; pro: number; ultra: number; unknown: number }
  funnel: { signedUp: number; connectedMt5: number; loggedTrade: number; signedUpPct: number; connectedPct: number; tradedPct: number }
  atRisk: { inactiveWeek: number; neverConnected: number }
  recentSignups: { id: string; email: string; created_at: string; last_seen_at: string | null; subscription_tier: string | null; mt5_login: string | null }[]
  bridgeStatus: string
  bridgeConnections: number
  supabaseStatus: string
  serverTime: string
  env: Record<string, boolean>
}

function FunnelBar({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: MONO }}>{label}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color, fontSize: '13px', fontWeight: 700, fontFamily: MONO }}>{value}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontFamily: MONO, width: '32px', textAlign: 'right' }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.6s ease', boxShadow: `0 0 6px ${color}55` }} />
      </div>
    </div>
  )
}

export function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/dev/stats', { cache: 'no-store' })
    if (res.ok) setStats(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 30_000)
    return () => clearInterval(iv)
  }, [load])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: G, fontSize: '12px', letterSpacing: '0.1em', opacity: 0.5, fontFamily: MONO }}>Loading console data...</div>
  if (!stats) return <div style={{ color: R, fontSize: '13px', textAlign: 'center', marginTop: '80px', fontFamily: MONO }}>Failed to load — check Supabase + env vars</div>

  return (
    <>
      {/* Row 1 — Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <Stat label="Total Users" value={stats.totalUsers} sub="registered" />
        <Stat label="Online Now" value={stats.onlineNow} sub="last 10 min" color={stats.onlineNow > 0 ? G : 'rgba(255,255,255,0.35)'} />
        <Stat label="New Today" value={stats.newToday} sub="last 24h" color={stats.newToday > 0 ? B : 'rgba(255,255,255,0.35)'} />
        <Stat label="New This Week" value={stats.newThisWeek} sub="last 7 days" color={B} />
        <Stat label="Total Trades" value={stats.totalTrades.toLocaleString()} sub="all time" />
        <Stat label="Trades Today" value={stats.tradesToday} sub="last 24h" color={stats.tradesToday > 0 ? G : 'rgba(255,255,255,0.35)'} />
      </div>

      {/* Row 2 — Revenue placeholder + Tier breakdown + Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <Card title="Revenue (Stripe)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'MRR', value: '€ —' },
              { label: 'Revenue today', value: '€ —' },
              { label: 'Churn this month', value: '—' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: MONO }}>{r.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 700, fontFamily: MONO }}>{r.value}</span>
              </div>
            ))}
            <div style={{ color: 'rgba(255,184,48,0.5)', fontSize: '10px', textAlign: 'center', marginTop: '4px', letterSpacing: '0.04em', fontFamily: MONO }}>Connect Stripe to unlock</div>
          </div>
        </Card>

        <Card title="Subscription Tiers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {([
              { label: 'Free', key: 'free', color: 'rgba(255,255,255,0.35)' },
              { label: 'Pro', key: 'pro', color: B },
              { label: 'Ultra', key: 'ultra', color: P },
            ] as const).map(tier => {
              const count = stats.tiers[tier.key]
              const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0
              return (
                <div key={tier.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: tier.color, fontSize: '11px', fontWeight: 600, fontFamily: MONO }}>{tier.label}</span>
                    <span style={{ color: tier.color, fontSize: '12px', fontWeight: 700, fontFamily: MONO }}>{count} <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, fontSize: '10px' }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: tier.color, borderRadius: '2px' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="User Funnel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FunnelBar label="Signed up" value={stats.funnel.signedUp} pct={100} color="rgba(255,255,255,0.5)" />
            <FunnelBar label="Connected MT5" value={stats.funnel.connectedMt5} pct={stats.funnel.connectedPct} color={B} />
            <FunnelBar label="First trade logged" value={stats.funnel.loggedTrade} pct={stats.funnel.tradedPct} color={G} />
          </div>
        </Card>
      </div>

      {/* Row 3 — At risk + System health + Env */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <Card title="Users at Risk">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,51,71,0.04)', border: '1px solid rgba(255,51,71,0.1)', borderRadius: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: MONO }}>Inactive 7+ days</span>
              <span style={{ color: stats.atRisk.inactiveWeek > 0 ? R : 'rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: 700, fontFamily: MONO }}>{stats.atRisk.inactiveWeek}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,184,48,0.04)', border: '1px solid rgba(255,184,48,0.1)', borderRadius: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: MONO }}>Never connected MT5</span>
              <span style={{ color: stats.atRisk.neverConnected > 0 ? GO : 'rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: 700, fontFamily: MONO }}>{stats.atRisk.neverConnected}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px', marginTop: '4px', fontFamily: MONO }}>These users may churn — consider a re-engagement email.</div>
          </div>
        </Card>

        <Card title="System Health">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Supabase DB', status: stats.supabaseStatus },
              { label: 'Hetzner Bridge', status: stats.bridgeStatus },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: MONO }}>{s.label}</span>
                <StatusDot status={s.status} />
              </div>
            ))}
            {stats.bridgeStatus === 'online' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,255,133,0.03)', borderRadius: '7px', border: '1px solid rgba(0,255,133,0.08)' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: MONO }}>Live EA connections</span>
                <span style={{ color: G, fontSize: '12px', fontWeight: 700, fontFamily: MONO }}>{stats.bridgeConnections}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Environment">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.entries(stats.env).map(([key, ok]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.015)', borderRadius: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: MONO }}>{key}</span>
                <StatusDot status={ok ? 'online' : 'offline'} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 4 — Recent signups */}
      <Card title={`Recent Signups (${stats.recentSignups.length})`}>
        {stats.recentSignups.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontFamily: MONO }}>No users yet</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '6px' }}>
            {stats.recentSignups.map((u) => {
              const isOnline = u.last_seen_at && new Date(u.last_seen_at) > new Date(Date.now() - 10 * 60 * 1000)
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(75,143,255,0.1)', border: '1px solid rgba(75,143,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: B, fontWeight: 700, flexShrink: 0, fontFamily: MONO }}>
                      {(u.email?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: MONO }}>{u.email ?? u.id.slice(0, 12)}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                        <span style={{ color: tierColor(u.subscription_tier), fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: MONO }}>{u.subscription_tier ?? 'free'}</span>
                        {u.mt5_login && <span style={{ color: G, fontSize: '9px', fontFamily: MONO }}>● MT5</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                    {isOnline && <span style={{ width: 6, height: 6, borderRadius: '50%', background: G, display: 'inline-block', boxShadow: `0 0 5px ${G}` }} />}
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', whiteSpace: 'nowrap', fontFamily: MONO }}>{fmtDate(u.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div style={{ marginTop: '14px', color: 'rgba(255,255,255,0.1)', fontSize: '10px', textAlign: 'right', letterSpacing: '0.03em', fontFamily: MONO }}>
        Server {stats.serverTime} · auto-refresh 30s
      </div>
    </>
  )
}
