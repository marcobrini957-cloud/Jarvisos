'use client'

import { useState, useEffect, useCallback } from 'react'
import Panel from '@/components/ui/Panel'

const KEY_ENABLED = 'vq_greeting_enabled'

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '40px', height: '22px', borderRadius: '11px',
        background: value ? 'rgba(232,201,106,0.8)' : 'var(--s3)',
        border: `1px solid ${value ? 'rgba(232,201,106,0.5)' : 'var(--bd2)'}`,
        cursor: 'pointer', padding: '0', position: 'relative',
        transition: 'background 0.2s ease, border-color 0.2s ease', flexShrink: 0,
      }}
      aria-checked={value} role="switch"
    >
      <span style={{
        position: 'absolute', top: '2px',
        left: value ? '20px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%',
        background: value ? '#000' : 'var(--t3)',
        transition: 'left 0.2s cubic-bezier(0.16,1,0.3,1)', display: 'block',
      }} />
    </button>
  )
}

// ── Status dot ─────────────────────────────────────────────────────────────────
function Dot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? 'var(--t3)' : ok ? 'var(--gr2)' : '#ef4444'
  return (
    <span style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: color,
      boxShadow: ok === true ? '0 0 5px var(--gr2)' : 'none',
      display: 'inline-block', flexShrink: 0,
    }} />
  )
}

// ── MT5 Accounts panel ─────────────────────────────────────────────────────────
interface EaStatus {
  api_key:      string
  ea_connected: boolean
  ea_last_seen: string | null
  ea_version:   string | null
  ea_broker:    string | null
}

function MT5AccountsPanel() {
  const [status,   setStatus]   = useState<EaStatus | null>(null)
  const [copied,   setCopied]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/user/api-key')
      if (res.ok) setStatus(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 8000)
    return () => clearInterval(id)
  }, [fetchStatus])

  function copyKey() {
    if (!status?.api_key) return
    navigator.clipboard.writeText(status.api_key).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function relativeTime(iso: string | null) {
    if (!iso) return null
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60)   return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  const connected  = status?.ea_connected ?? false
  const lastSeenTs = relativeTime(status?.ea_last_seen ?? null)

  return (
    <Panel title="MT5 Accounts">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Connection badge ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderRadius: '10px',
          background: connected ? 'rgba(0,255,133,0.06)' : 'var(--s3)',
          border: `1px solid ${connected ? 'rgba(0,255,133,0.2)' : 'var(--bd2)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Dot ok={status === null ? null : connected} />
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: connected ? 'var(--gr2)' : 'var(--t2)' }}>
                {status === null
                  ? 'Checking…'
                  : connected
                    ? `Connected${status?.ea_broker ? ` · ${status.ea_broker}` : ''}`
                    : 'EA not connected'}
              </p>
              {connected && status && (status.ea_version || lastSeenTs) && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--t3)' }}>
                  {[status.ea_version ? `v${status.ea_version}` : null, lastSeenTs ? `last sync ${lastSeenTs}` : null]
                    .filter(Boolean).join(' · ')}
                </p>
              )}
              {!connected && status !== null && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--t3)' }}>
                  Install the EA and attach it to any chart in MT5
                </p>
              )}
            </div>
          </div>

          {/* Download EA */}
          <a
            href="/ea/VelquorBridge.mq5"
            download="VelquorBridge.mq5"
            style={{
              padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
              background: 'var(--ac)', color: 'white', textDecoration: 'none',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Download EA
          </a>
        </div>

        {/* ── API Key ──────────────────────────────────────────────────────── */}
        <div>
          <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 500, color: 'var(--t3)' }}>
            API KEY — paste this into the EA inputs when you attach it
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--s2)', border: '1px solid var(--bd2)',
            borderRadius: '9px', padding: '9px 12px',
          }}>
            <code style={{
              flex: 1, fontFamily: 'monospace', fontSize: '12px',
              color: 'var(--t1)', wordBreak: 'break-all',
            }}>
              {status ? status.api_key : '…'}
            </code>
            <button
              onClick={copyKey}
              disabled={!status?.api_key}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: 'none',
                background: copied ? 'rgba(0,255,133,0.15)' : 'var(--s3)',
                color: copied ? 'var(--gr2)' : 'var(--t2)',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'var(--t3)' }}>
            Keep this private — it gives write access to your VELQUOR data.
          </p>
        </div>

        {/* ── Setup guide (collapsible) ─────────────────────────────────────── */}
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: 'none', border: 'none', padding: '0',
              color: 'var(--ac)', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}>▶</span>
            {expanded ? 'Hide setup guide' : 'Show setup guide'}
          </button>

          {expanded && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ['Download', <>Download <strong style={{ color: 'var(--t1)' }}>VelquorBridge.mq5</strong> above and copy it into your MT5 <code style={{ fontFamily: 'monospace', background: 'var(--s3)', padding: '1px 4px', borderRadius: '3px', fontSize: '11px' }}>MQL5/Experts/</code> folder.</>],
                ['Allow URL', <>In MT5: <strong style={{ color: 'var(--t1)' }}>Tools → Options → Expert Advisors</strong> — tick &ldquo;Allow WebRequest&rdquo; and add <code style={{ fontFamily: 'monospace', background: 'var(--s3)', padding: '1px 4px', borderRadius: '3px', fontSize: '11px' }}>https://bridge.velquor.app</code></>],
                ['Attach EA', <>Drag <strong style={{ color: 'var(--t1)' }}>VelquorBridge</strong> onto any chart. Paste your API key above into the <em>InpApiKey</em> input and click OK.</>],
                ['Enable trading', <>Enable <strong style={{ color: 'var(--t1)' }}>Auto Trading</strong> in MT5 (green toolbar button). The smiley face on the chart confirms the EA is running.</>],
              ].map(([step, desc], i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    minWidth: '20px', height: '20px', borderRadius: '50%',
                    background: 'var(--ac)', color: 'white',
                    fontSize: '10px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '1px',
                  }}>{i + 1}</div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--t2)', lineHeight: 1.55 }}>{desc as React.ReactNode}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}

// ── System health ──────────────────────────────────────────────────────────────
type HealthData = Record<string, boolean | string>

function statusLabel(val: boolean | string | undefined): { text: string; ok: boolean } {
  if (val === undefined) return { text: 'Checking…', ok: false }
  if (typeof val === 'boolean') return { text: val ? 'Configured' : 'Missing', ok: val }
  if (val === 'OK') return { text: 'Connected', ok: true }
  if (val.startsWith('OK')) return { text: val.replace('OK — ', ''), ok: true }
  if (val.startsWith('ERROR') || val.startsWith('EXCEPTION')) return { text: 'Error', ok: false }
  return { text: val, ok: false }
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function SettingsTab() {
  const [greetingEnabled, setGreetingEnabled] = useState(true)
  const [health,          setHealth]          = useState<HealthData | null>(null)
  const [checking,        setChecking]        = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(KEY_ENABLED)
    setGreetingEnabled(stored !== 'false')
  }, [])

  useEffect(() => {
    setChecking(true)
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setHealth(d))
      .catch(() => setHealth({}))
      .finally(() => setChecking(false))
  }, [])

  function toggleGreeting(val: boolean) {
    setGreetingEnabled(val)
    localStorage.setItem(KEY_ENABLED, String(val))
    if (val) localStorage.removeItem('vq_greeting_date')
  }

  function healthRow(label: string, key: string) {
    const { text, ok } = health ? statusLabel(health[key]) : { text: 'Checking…', ok: false }
    return (
      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
        <span style={{ color: 'var(--t2)', fontSize: '12px' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Dot ok={health ? ok : null} />
          <span style={{ color: ok ? 'var(--gr2)' : health ? '#ef4444' : 'var(--t3)', fontSize: '12px', fontWeight: 500 }}>{text}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
      <div>
        <h1 style={{ color: 'var(--t1)', fontSize: '18px', fontWeight: 600 }}>Settings</h1>
        <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '4px' }}>MT5 connection, integrations and preferences</p>
      </div>

      {/* ── MT5 Accounts ── */}
      <MT5AccountsPanel />

      {/* ── Personalization ── */}
      <Panel title="Personalization">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 500, margin: 0 }}>Daily greeting &amp; affirmation</p>
            <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '2px' }}>
              Shows a motivational message when you open the app each day
            </p>
          </div>
          <Toggle value={greetingEnabled} onChange={toggleGreeting} />
        </div>
      </Panel>

      {/* ── Connected Services ── */}
      <Panel title={checking ? 'System Status (checking…)' : 'System Status'}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {healthRow('Supabase (database)', 'supabase_connection')}
          {healthRow('Groq AI (VELQUOR brain)', 'GROQ_API_KEY')}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
            <span style={{ color: 'var(--t2)', fontSize: '12px' }}>Yahoo Finance (portfolio &amp; metals)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Dot ok={true} />
              <span style={{ color: 'var(--gr2)', fontSize: '12px', fontWeight: 500 }}>Active</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: 'var(--t2)', fontSize: '12px' }}>Forex Factory (calendar)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Dot ok={true} />
              <span style={{ color: 'var(--gr2)', fontSize: '12px', fontWeight: 500 }}>Active</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Screenshot Storage ── */}
      <Panel title="Screenshot Storage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Dot ok={health ? health['supabase_connection'] === 'OK' : null} />
            <span style={{ color: 'var(--t2)', fontSize: '12px' }}>
              Supabase Storage — bucket:{' '}
              <code style={{ color: 'var(--ac)', fontSize: '11px' }}>trade-screenshots</code>
            </span>
          </div>
          <p style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: '1.6', margin: 0 }}>
            Screenshots are auto-uploaded when you annotate a trade and served via public CDN.
          </p>
        </div>
      </Panel>
    </div>
  )
}
