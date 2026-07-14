'use client'

// Shared primitives for the /dev admin console (Void Black terminal aesthetic).

export const MONO = "ui-monospace, 'SF Mono', Menlo, monospace"
export const G = '#00FF85'
export const R = '#FF3347'
export const B = '#4B8FFF'
export const GO = '#FFB830'
export const P = '#A87EFF'

export function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: MONO }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  )
}

export function Stat({ label, value, sub, color = '#fff' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '18px 20px' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontFamily: MONO }}>{label}</div>
      <div style={{ color, fontSize: '30px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, fontFamily: MONO }}>{value}</div>
      {sub && <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '11px', marginTop: '5px', fontFamily: MONO }}>{sub}</div>}
    </div>
  )
}

export function StatusDot({ status }: { status: string }) {
  const color = status === 'online' || status === 'ok' ? G
    : status === 'not_configured' || status === 'never_seen' || status === 'maintenance' ? GO : R
  const label = status.replaceAll('_', ' ')
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
      <span style={{ color, fontSize: '11px', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </span>
  )
}

export function Btn({ children, onClick, color = G, disabled, small }: {
  children: React.ReactNode; onClick?: () => void; color?: string; disabled?: boolean; small?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: `${color}10`, border: `1px solid ${color}30`, borderRadius: '7px',
      color: disabled ? 'rgba(255,255,255,0.2)' : color,
      fontSize: small ? '10px' : '11px', padding: small ? '4px 10px' : '7px 14px',
      cursor: disabled ? 'default' : 'pointer', letterSpacing: '0.05em', fontFamily: MONO,
      whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  )
}

export const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '7px', padding: '8px 12px', color: '#fff', fontSize: '12px',
  fontFamily: MONO, outline: 'none',
}

export function SchemaBanner() {
  return (
    <div style={{
      background: 'rgba(255,184,48,0.05)', border: '1px solid rgba(255,184,48,0.25)',
      borderRadius: '10px', padding: '14px 18px', marginBottom: '16px',
      color: GO, fontSize: '12px', fontFamily: MONO, lineHeight: 1.6,
    }}>
      ⚠ Database migration pending — run <b>supabase-admin-foundation.sql</b> in the
      Supabase SQL Editor to unlock users, bans, rewards, bridge settings and the audit log.
    </div>
  )
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function tierColor(t: string | null | undefined) {
  if (t === 'ultra') return P
  if (t === 'pro') return B
  return 'rgba(255,255,255,0.35)'
}
