'use client'
import { useCallback, useEffect, useState } from 'react'
import { MONO, G, R, B, GO, P, Card, Btn, inputStyle, SchemaBanner, fmtDate, tierColor } from '../ui'

type AdminUser = {
  id: string
  email: string | null
  display_name: string | null
  subscription_tier: string | null
  tier_expires_at: string | null
  mt5_login: string | null
  ea_connected: boolean | null
  ea_last_seen: string | null
  ea_version: string | null
  ea_broker: string | null
  banned: boolean | null
  banned_reason: string | null
  banned_at: string | null
  admin_note: string | null
  last_seen_at: string | null
  created_at: string
  velquor_api_key: string | null
}

type Detail = {
  profile: AdminUser
  stats: {
    trades: number
    openTrades: number
    journalEntries: number
    copyGroups: number
    lastSnapshot: { balance: number; equity: number; snapshot_at: string } | null
  }
}

const FILTERS = ['all', 'online', 'pro', 'ultra', 'banned'] as const

export function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [schemaPending, setSchemaPending] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const [selected, setSelected] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  // action sub-forms
  const [banReason, setBanReason] = useState('')
  const [banConfirm, setBanConfirm] = useState(false)
  const [rewardTier, setRewardTier] = useState<'pro' | 'ultra'>('pro')
  const [rewardDays, setRewardDays] = useState('30')
  const [note, setNote] = useState('')
  const [freshKey, setFreshKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (filter !== 'all') params.set('filter', filter)
    const res = await fetch(`/api/dev/users?${params}`, { cache: 'no-store' })
    if (res.ok) {
      const d = await res.json()
      setUsers(d.users ?? [])
      setSchemaPending(!!d.schemaPending)
    }
  }, [q, filter])

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  async function openDetail(id: string) {
    setBanConfirm(false); setFreshKey(null); setFlash(null)
    const res = await fetch(`/api/dev/users/${id}`, { cache: 'no-store' })
    if (res.ok) {
      const d: Detail = await res.json()
      setSelected(d)
      setNote(d.profile.admin_note ?? '')
    }
  }

  async function act(id: string, body: Record<string, unknown>, successMsg: string) {
    setBusy(true)
    const res = await fetch(`/api/dev/users/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) {
      setFlash(successMsg)
      if (d.newApiKey) setFreshKey(d.newApiKey)
      setBanConfirm(false); setBanReason('')
      await Promise.all([openDetail(id), load()])
    } else {
      setFlash(d.schemaPending ? 'Blocked: run supabase-admin-foundation.sql first' : `Failed: ${d.error ?? res.status}`)
    }
  }

  const sel = selected?.profile

  return (
    <>
      {schemaPending && <SchemaBanner />}

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search email, name, MT5 login…"
          style={{ ...inputStyle, flex: 1, minWidth: '240px' }}
        />
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? 'rgba(0,255,133,0.1)' : 'transparent',
            border: `1px solid ${filter === f ? 'rgba(0,255,133,0.25)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '6px', color: filter === f ? G : 'rgba(255,255,255,0.3)',
            fontSize: '10px', padding: '6px 12px', cursor: 'pointer', fontFamily: MONO,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{f}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: sel ? 'minmax(0,1fr) 420px' : '1fr', gap: '12px', alignItems: 'start' }}>
        {/* User table */}
        <Card title={`Users (${users.length})`}>
          {users.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontFamily: MONO }}>
              {schemaPending ? 'Waiting for migration…' : 'No users match.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {users.map(u => {
                const online = u.last_seen_at && new Date(u.last_seen_at) > new Date(Date.now() - 10 * 60 * 1000)
                return (
                  <button key={u.id} onClick={() => openDetail(u.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
                    padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                    background: sel?.id === u.id ? 'rgba(0,255,133,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${sel?.id === u.id ? 'rgba(0,255,133,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    fontFamily: MONO,
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: u.banned ? R : online ? G : 'rgba(255,255,255,0.12)', boxShadow: online ? `0 0 5px ${G}` : 'none' }} />
                    <span style={{ flex: 1, minWidth: 0, color: u.banned ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: u.banned ? 'line-through' : 'none' }}>
                      {u.email ?? u.display_name ?? u.id.slice(0, 12)}
                    </span>
                    {u.banned && <span style={{ color: R, fontSize: '8px', fontWeight: 700, border: `1px solid ${R}40`, borderRadius: '4px', padding: '1px 6px', letterSpacing: '0.08em' }}>BANNED</span>}
                    <span style={{ color: tierColor(u.subscription_tier), fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', width: '38px', textAlign: 'right' }}>{u.subscription_tier ?? 'free'}</span>
                    {u.ea_connected ? <span style={{ color: G, fontSize: '9px' }}>EA●</span> : <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '9px' }}>EA○</span>}
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* Detail + actions panel */}
        {sel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '76px' }}>
            <Card
              title="User"
              right={<button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '14px', fontFamily: MONO }}>×</button>}
            >
              <div style={{ fontFamily: MONO }}>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '2px', wordBreak: 'break-all' }}>{sel.email ?? sel.id}</div>
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginBottom: '12px' }}>{sel.id}</div>

                {sel.banned && (
                  <div style={{ background: 'rgba(255,51,71,0.06)', border: '1px solid rgba(255,51,71,0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                    <div style={{ color: R, fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>BANNED {fmtDate(sel.banned_at)}</div>
                    {sel.banned_reason && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '4px' }}>{sel.banned_reason}</div>}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                  {[
                    { l: 'Tier', v: `${sel.subscription_tier ?? 'free'}${sel.tier_expires_at ? ` → ${fmtDate(sel.tier_expires_at)}` : ''}`, c: tierColor(sel.subscription_tier) },
                    { l: 'Signed up', v: fmtDate(sel.created_at) },
                    { l: 'Last seen', v: fmtDate(sel.last_seen_at) },
                    { l: 'MT5', v: sel.mt5_login ?? '—' },
                    { l: 'EA', v: sel.ea_connected ? `v${sel.ea_version ?? '?'} · ${sel.ea_broker ?? ''}` : 'offline', c: sel.ea_connected ? G : undefined },
                    { l: 'API key', v: sel.velquor_api_key ?? '—' },
                    { l: 'Trades', v: `${selected!.stats.trades} (${selected!.stats.openTrades} open)` },
                    { l: 'Journal / Copy', v: `${selected!.stats.journalEntries} / ${selected!.stats.copyGroups}` },
                  ].map(row => (
                    <div key={row.l} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px', padding: '7px 10px' }}>
                      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.l}</div>
                      <div style={{ color: row.c ?? 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '2px', wordBreak: 'break-all' }}>{row.v}</div>
                    </div>
                  ))}
                </div>

                {selected!.stats.lastSnapshot && (
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginBottom: '12px' }}>
                    Last snapshot: balance €{selected!.stats.lastSnapshot.balance.toLocaleString()} · equity €{selected!.stats.lastSnapshot.equity.toLocaleString()} · {fmtDate(selected!.stats.lastSnapshot.snapshot_at)}
                  </div>
                )}

                {flash && <div style={{ color: flash.startsWith('Failed') || flash.startsWith('Blocked') ? R : G, fontSize: '11px', marginBottom: '10px' }}>{flash}</div>}
                {freshKey && (
                  <div style={{ background: 'rgba(0,255,133,0.05)', border: '1px solid rgba(0,255,133,0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                    <div style={{ color: G, fontSize: '10px', letterSpacing: '0.06em', marginBottom: '4px' }}>NEW API KEY — copy now, shown once</div>
                    <div style={{ color: '#fff', fontSize: '11px', wordBreak: 'break-all', userSelect: 'all' }}>{freshKey}</div>
                  </div>
                )}
              </div>
            </Card>

            {/* Reward */}
            <Card title="Reward · Tier">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={rewardTier} onChange={e => setRewardTier(e.target.value as 'pro' | 'ultra')} style={{ ...inputStyle, color: rewardTier === 'ultra' ? P : B, cursor: 'pointer' }}>
                  <option value="pro" style={{ background: '#0a0a0f' }}>Pro</option>
                  <option value="ultra" style={{ background: '#0a0a0f' }}>Ultra</option>
                </select>
                <input value={rewardDays} onChange={e => setRewardDays(e.target.value.replace(/\D/g, ''))} style={{ ...inputStyle, width: '64px' }} placeholder="days" />
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontFamily: MONO }}>days (empty = forever)</span>
                <Btn color={GO} disabled={busy} onClick={() => act(sel.id, { action: 'set_tier', tier: rewardTier, expires_days: rewardDays ? Number(rewardDays) : null }, `Granted ${rewardTier}${rewardDays ? ` for ${rewardDays} days` : ''}`)}>🎁 Grant</Btn>
                {sel.subscription_tier !== 'free' && (
                  <Btn color={R} small disabled={busy} onClick={() => act(sel.id, { action: 'set_tier', tier: 'free' }, 'Downgraded to free')}>Revoke → free</Btn>
                )}
              </div>
            </Card>

            {/* Help */}
            <Card title="Help · Support">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Btn color={B} disabled={busy} onClick={() => act(sel.id, { action: 'reset_api_key' }, 'API key reset — EA must be updated')}>↻ Reset API key</Btn>
                </div>
                <textarea
                  value={note} onChange={e => setNote(e.target.value)} rows={3}
                  placeholder="Admin note (support history, context…)"
                  style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                />
                <div>
                  <Btn small disabled={busy || note === (sel.admin_note ?? '')} onClick={() => act(sel.id, { action: 'set_note', note }, 'Note saved')}>Save note</Btn>
                </div>
              </div>
            </Card>

            {/* Ban */}
            <Card title="Danger Zone">
              {sel.banned ? (
                <Btn color={G} disabled={busy} onClick={() => act(sel.id, { action: 'unban' }, 'User unbanned')}>Unban user</Btn>
              ) : !banConfirm ? (
                <Btn color={R} onClick={() => setBanConfirm(true)}>Ban user…</Btn>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason (stored + shown in audit log)" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Btn color={R} disabled={busy} onClick={() => act(sel.id, { action: 'ban', reason: banReason }, 'User banned')}>Confirm ban</Btn>
                    <Btn small onClick={() => { setBanConfirm(false); setBanReason('') }}>Cancel</Btn>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontFamily: MONO }}>
                    Blocks every API route and the bridge (EA sync + copy) within 60 s.
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
