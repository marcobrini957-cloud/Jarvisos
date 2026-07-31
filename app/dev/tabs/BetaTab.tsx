'use client'

import { useEffect, useState } from 'react'
import { Card, Btn, MONO, G, R, GO, B, inputStyle, fmtDate, tierColor } from '../ui'

/**
 * The private beta roster.
 *
 * One code per person, so the answer to "who is actually in there, and did they
 * ever connect anything?" is a table rather than a guess. The shared
 * SITE_PASSWORD still works and is still Marco's own way in — this sits beside
 * it, not instead of it.
 */

interface Invite {
  code:           string
  name:           string
  note:           string | null
  created_at:     string
  first_used_at:  string | null
  last_seen_at:   string | null
  use_count:      number
  redeemed_at:    string | null
  redeemed_by:    string | null
  redeemed_email: string | null
  revoked_at:     string | null
  grant_tier:     'free' | 'pro' | 'ultra'
  grant_days:     number
  account: null | { tier: string; last_seen_at: string | null; banned: boolean; trades: number }
}

export function BetaTab() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [name,    setName]    = useState('')
  const [tier,    setTier]    = useState<'free' | 'pro' | 'ultra'>('pro')
  const [days,    setDays]    = useState(90)
  const [busy,    setBusy]    = useState(false)
  const [copied,  setCopied]  = useState<string | null>(null)
  const [error,   setError]   = useState('')

  async function load() {
    try {
      const r = await fetch('/api/dev/beta')
      if (r.ok) setInvites(await r.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!name.trim() || busy) return
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/dev/beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), grant_tier: tier, grant_days: days }),
      })
      const body = await r.json()
      if (!r.ok) { setError(body.error ?? 'Could not create the code'); return }
      setName('')
      await load()
    } finally { setBusy(false) }
  }

  async function setRevoked(code: string, revoked: boolean) {
    await fetch(`/api/dev/beta/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revoked }),
    })
    await load()
  }

  async function remove(code: string) {
    const r = await fetch(`/api/dev/beta/${encodeURIComponent(code)}`, { method: 'DELETE' })
    if (!r.ok) setError((await r.json()).error ?? 'Could not delete')
    await load()
  }

  // The invite link carries the code, so the tester never has to retype it —
  // they land on the gate with the field already filled.
  function inviteLink(code: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://velquor.app'
    return `${origin}/gate?code=${encodeURIComponent(code)}`
  }

  async function copy(code: string, what: 'code' | 'link') {
    await navigator.clipboard.writeText(what === 'code' ? code : inviteLink(code))
    setCopied(`${code}:${what}`)
    setTimeout(() => setCopied(null), 1600)
  }

  const live     = invites.filter(i => !i.revoked_at)
  const redeemed = live.filter(i => i.redeemed_by)
  const active   = redeemed.filter(i => (i.account?.trades ?? 0) > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px' }}>
        <Mini label="Codes out"  value={live.length} />
        <Mini label="Signed up"  value={redeemed.length} color={B} />
        <Mini label="Connected"  value={active.length} color={G}
              sub={active.length < redeemed.length ? `${redeemed.length - active.length} never linked MT5` : undefined} />
      </div>

      <Card title="Invite someone">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') create() }}
            placeholder="Their name"
            style={{ ...inputStyle, flex: '1 1 180px' }}
          />
          <select value={tier} onChange={e => setTier(e.target.value as 'free' | 'pro' | 'ultra')} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="ultra">ultra</option>
          </select>
          <input
            type="number" min={1} max={3650} value={days}
            onChange={e => setDays(Math.max(1, Number(e.target.value) || 1))}
            style={{ ...inputStyle, width: '84px' }}
          />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontFamily: MONO }}>days</span>
          <Btn onClick={create} disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create code'}</Btn>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontFamily: MONO, marginTop: '10px', lineHeight: 1.6 }}>
          The code opens the site and puts their account on <b style={{ color: tierColor(tier) }}>{tier}</b> for {days} days
          when they sign up. It never downgrades an account that is already higher.
        </div>
        {error && <div style={{ color: R, fontSize: '11px', fontFamily: MONO, marginTop: '8px' }}>{error}</div>}
      </Card>

      <Card title={`Invites — ${invites.length}`} right={<Btn small color={B} onClick={load}>Refresh</Btn>}>
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: MONO }}>Loading…</div>
        ) : invites.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: MONO }}>
            No codes yet. Create one above and send it to your first tester.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '11px', minWidth: '760px' }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.28)', textAlign: 'left' }}>
                  {['Code', 'Who', 'Grants', 'Status', 'Account', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invites.map(i => {
                  const revoked = !!i.revoked_at
                  return (
                    <tr key={i.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: revoked ? 0.45 : 1 }}>
                      <td style={{ padding: '10px' }}>
                        <button onClick={() => copy(i.code, 'code')} title="Copy the code" style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          color: revoked ? 'rgba(255,255,255,0.4)' : '#fff', fontFamily: MONO, fontSize: '12px', letterSpacing: '0.04em',
                        }}>{i.code}</button>
                        <div style={{ marginTop: '4px' }}>
                          <button onClick={() => copy(i.code, 'link')} style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            color: copied === `${i.code}:link` ? G : 'rgba(255,255,255,0.28)', fontFamily: MONO, fontSize: '10px',
                          }}>{copied === `${i.code}:link` ? 'link copied' : 'copy invite link'}</button>
                          {copied === `${i.code}:code` && <span style={{ color: G, fontSize: '10px', marginLeft: '8px' }}>copied</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px', color: 'rgba(255,255,255,0.8)' }}>
                        {i.name}
                        {i.redeemed_email && (
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '3px' }}>{i.redeemed_email}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: tierColor(i.grant_tier) }}>
                        {i.grant_tier}
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}> · {i.grant_days}d</span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        {revoked ? <span style={{ color: R }}>revoked</span>
                          : i.redeemed_at ? <span style={{ color: G }}>signed up</span>
                          : i.first_used_at ? <span style={{ color: GO }}>opened, no account</span>
                          : <span style={{ color: 'rgba(255,255,255,0.3)' }}>never used</span>}
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '3px' }}>
                          {i.last_seen_at ? `last in ${fmtDate(i.last_seen_at)}` : `made ${fmtDate(i.created_at)}`}
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        {i.account ? (
                          <>
                            <span style={{ color: tierColor(i.account.tier) }}>{i.account.tier}</span>
                            <span style={{ color: i.account.trades > 0 ? G : 'rgba(255,255,255,0.3)' }}>
                              {' · '}{i.account.trades} trades
                            </span>
                            {i.account.banned && <div style={{ color: R, fontSize: '10px', marginTop: '3px' }}>banned</div>}
                          </>
                        ) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {revoked
                          ? <Btn small color={G} onClick={() => setRevoked(i.code, false)}>Restore</Btn>
                          : <Btn small color={R} onClick={() => setRevoked(i.code, true)}>Revoke</Btn>}
                        {!i.redeemed_by && (
                          <span style={{ marginLeft: '6px' }}>
                            <Btn small color="rgba(255,255,255,0.4)" onClick={() => remove(i.code)}>Delete</Btn>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', fontFamily: MONO, marginTop: '14px', lineHeight: 1.7 }}>
          Revoking bans the linked account, which cuts it off from every API route within a minute.
          It cannot pull back a gate cookie already in their browser, so what a revoked tester keeps
          is the marketing site — not the product.
        </div>
      </Card>
    </div>
  )
}

function Mini({ label, value, sub, color = '#fff' }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: MONO }}>{label}</div>
      <div style={{ color, fontSize: '24px', fontWeight: 900, lineHeight: 1, fontFamily: MONO }}>{value}</div>
      {sub && <div style={{ color: GO, fontSize: '10px', marginTop: '5px', fontFamily: MONO }}>{sub}</div>}
    </div>
  )
}
