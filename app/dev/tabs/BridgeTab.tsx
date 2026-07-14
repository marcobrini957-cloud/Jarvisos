'use client'
import { useCallback, useEffect, useState } from 'react'
import { MONO, G, R, GO, Card, Stat, StatusDot, Btn, inputStyle, SchemaBanner, fmtDate } from '../ui'

type BridgeData = {
  schemaPending: boolean
  status: string
  settings?: {
    maintenance_mode: boolean
    sync_enabled: boolean
    copy_enabled: boolean
    rate_limit_sync: number
    rate_limit_copy: number
    min_ea_version: string
    broadcast_message: string | null
    updated_at: string
    bridge_last_seen: string | null
    bridge_version: string | null
    bridge_started_at: string | null
    bridge_stats: Record<string, unknown> | null
  }
  live?: {
    uptime_s: number
    rss_mb: number
    settings_source: string
    metrics: Record<string, unknown>
  } | null
}

function Toggle({ label, desc, value, onChange, danger }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean
}) {
  const activeColor = danger ? R : G
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', gap: '12px' }}>
      <div style={{ fontFamily: MONO, minWidth: 0 }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{label}</div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '2px' }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0, cursor: 'pointer', position: 'relative',
        background: value ? `${activeColor}30` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${value ? `${activeColor}60` : 'rgba(255,255,255,0.12)'}`,
        transition: 'background 0.15s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: value ? 20 : 2, width: 16, height: 16, borderRadius: '50%',
          background: value ? activeColor : 'rgba(255,255,255,0.3)', transition: 'left 0.15s',
        }} />
      </button>
    </div>
  )
}

export function BridgeTab() {
  const [data, setData] = useState<BridgeData | null>(null)
  const [form, setForm] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/dev/bridge', { cache: 'no-store' })
    if (res.ok) {
      const d: BridgeData = await res.json()
      setData(d)
      if (d.settings) {
        setForm({
          maintenance_mode: d.settings.maintenance_mode,
          sync_enabled: d.settings.sync_enabled,
          copy_enabled: d.settings.copy_enabled,
          rate_limit_sync: d.settings.rate_limit_sync,
          rate_limit_copy: d.settings.rate_limit_copy,
          min_ea_version: d.settings.min_ea_version,
          broadcast_message: d.settings.broadcast_message ?? '',
        })
      }
    }
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 30_000)
    return () => clearInterval(iv)
  }, [load])

  async function save(partial?: Record<string, unknown>) {
    if (!form) return
    setBusy(true)
    const body = partial ?? {
      ...form,
      rate_limit_sync: Number(form.rate_limit_sync),
      rate_limit_copy: Number(form.rate_limit_copy),
    }
    const res = await fetch('/api/dev/bridge', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    setFlash(res.ok ? 'Saved — bridge applies it within 30 s' : d.schemaPending ? 'Blocked: run supabase-admin-foundation.sql first' : `Failed: ${d.error ?? res.status}`)
    if (res.ok) load()
  }

  if (!data) return <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: MONO, fontSize: '12px' }}>Loading bridge…</div>
  if (data.schemaPending) return <SchemaBanner />

  const s = data.settings!
  const stats = (data.live?.metrics ?? s.bridge_stats ?? {}) as Record<string, number | string | null>
  const uptime = data.live?.uptime_s ?? (s.bridge_started_at ? Math.round((Date.now() - new Date(s.bridge_started_at).getTime()) / 1000) : null)

  return (
    <>
      {/* Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: MONO }}>Bridge</div>
          <StatusDot status={data.status} />
          <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px', marginTop: '6px', fontFamily: MONO }}>
            {s.bridge_last_seen ? `heartbeat ${fmtDate(s.bridge_last_seen)}` : 'no heartbeat yet — deploy pending'}
          </div>
        </div>
        <Stat label="Version" value={s.bridge_version ?? '—'} sub={data.live ? `live · ${data.live.rss_mb} MB` : 'from heartbeat'} />
        <Stat label="Uptime" value={uptime != null ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m` : '—'} />
        <Stat label="Syncs" value={Number(stats.syncs ?? 0).toLocaleString()} sub="since boot" color={G} />
        <Stat label="Copy signals" value={Number(stats.signals ?? 0).toLocaleString()} sub="since boot" />
        <Stat label="Errors" value={Number(stats.errors ?? 0)} sub={stats.last_error ? String(stats.last_error).slice(0, 40) : 'none'} color={Number(stats.errors ?? 0) > 0 ? R : 'rgba(255,255,255,0.35)'} />
      </div>

      {flash && <div style={{ color: flash.startsWith('Failed') || flash.startsWith('Blocked') ? R : G, fontSize: '11px', fontFamily: MONO, marginBottom: '12px' }}>{flash}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
        {/* Kill switches */}
        <Card title="Controls">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Toggle danger label="Maintenance mode" desc="503 on every route — EAs retry automatically"
              value={!!form?.maintenance_mode}
              onChange={v => { setForm(f => ({ ...f, maintenance_mode: v })); save({ maintenance_mode: v }) }} />
            <Toggle label="MT5 sync" desc="/sync — trade + account ingestion"
              value={!!form?.sync_enabled}
              onChange={v => { setForm(f => ({ ...f, sync_enabled: v })); save({ sync_enabled: v }) }} />
            <Toggle label="Copy trading" desc="/copy/* — signals, polling, acks"
              value={!!form?.copy_enabled}
              onChange={v => { setForm(f => ({ ...f, copy_enabled: v })); save({ copy_enabled: v }) }} />
          </div>
        </Card>

        {/* API settings */}
        <Card title="API Settings">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: MONO }}>
            {([
              { key: 'rate_limit_sync', label: 'Sync rate limit', sub: 'requests / 15 min / API key' },
              { key: 'rate_limit_copy', label: 'Copy rate limit', sub: 'requests / 15 min / API key' },
              { key: 'min_ea_version', label: 'Min EA version', sub: 'older EAs get 426 upgrade_required' },
            ] as const).map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{f.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>{f.sub}</div>
                </div>
                <input
                  value={String(form?.[f.key] ?? '')}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ ...inputStyle, width: '90px', textAlign: 'right' }}
                />
              </div>
            ))}
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '4px' }}>Broadcast note</div>
              <input
                value={String(form?.broadcast_message ?? '')}
                onChange={e => setForm(prev => ({ ...prev, broadcast_message: e.target.value }))}
                placeholder="Internal status note (shown here)"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Btn disabled={busy} onClick={() => save()}>Save settings</Btn>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>last change {fmtDate(s.updated_at)}</span>
            </div>
          </div>
        </Card>
      </div>

      {!data.live && data.status === 'online' && (
        <div style={{ color: GO, fontSize: '10px', fontFamily: MONO, marginTop: '12px', opacity: 0.7 }}>
          ℹ Live /admin/stats not reachable — set BRIDGE_URL + BRIDGE_ADMIN_TOKEN in Vercel env for instant apply + live metrics. Heartbeat data (≤30 s old) shown instead.
        </div>
      )}
    </>
  )
}
