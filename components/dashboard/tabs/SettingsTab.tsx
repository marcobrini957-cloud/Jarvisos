'use client'

import { useState, useEffect } from 'react'
import Panel from '@/components/ui/Panel'

const KEY_ENABLED = 'vq_greeting_enabled'
const KEY_DATE    = 'vq_greeting_date'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '40px', height: '22px',
        borderRadius: '11px',
        background: value ? 'rgba(232,201,106,0.8)' : 'var(--s3)',
        border: `1px solid ${value ? 'rgba(232,201,106,0.5)' : 'var(--bd2)'}`,
        cursor: 'pointer', padding: '0', position: 'relative',
        transition: 'background 0.2s ease, border-color 0.2s ease',
        flexShrink: 0,
      }}
      aria-checked={value}
      role="switch"
    >
      <span style={{
        position: 'absolute', top: '2px',
        left: value ? '20px' : '2px',
        width: '16px', height: '16px',
        borderRadius: '50%',
        background: value ? '#000' : 'var(--t3)',
        transition: 'left 0.2s cubic-bezier(0.16,1,0.3,1)',
        display: 'block',
      }} />
    </button>
  )
}

type HealthData = Record<string, boolean | string>

function StatusDot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? 'var(--t3)' : ok ? 'var(--gr2)' : '#ef4444'
  return <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
}

function statusLabel(val: boolean | string | undefined): { text: string; ok: boolean } {
  if (val === undefined) return { text: 'Checking…', ok: false }
  if (typeof val === 'boolean') return { text: val ? 'Configured' : 'Missing', ok: val }
  if (val === 'OK') return { text: 'Connected', ok: true }
  if (val.startsWith('OK')) return { text: val.replace('OK — ', ''), ok: true }
  if (val.startsWith('ERROR') || val.startsWith('EXCEPTION')) return { text: 'Error', ok: false }
  return { text: val, ok: false }
}

export default function SettingsTab() {
  const [greetingEnabled, setGreetingEnabled] = useState(true)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [checking, setChecking] = useState(false)

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
    if (val) localStorage.removeItem(KEY_DATE)
  }

  const row = (label: string, healthKey: string | null, staticOk?: boolean, staticText?: string) => {
    let text: string
    let ok: boolean | null = null

    if (healthKey && health) {
      const r = statusLabel(health[healthKey])
      text = r.text
      ok = r.ok
    } else if (staticText !== undefined && staticOk !== undefined) {
      text = staticText
      ok = staticOk
    } else {
      text = checking ? 'Checking…' : '—'
    }

    return (
      <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--bd)' }}>
        <span style={{ color: 'var(--t2)', fontSize: '12px' }}>{label}</span>
        <div className="flex items-center gap-2">
          <StatusDot ok={ok} />
          <span style={{ color: ok ? 'var(--gr2)' : ok === false ? '#ef4444' : 'var(--t3)', fontSize: '12px', fontWeight: 500 }}>{text}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 style={{ color: 'var(--t1)', fontSize: '18px', fontWeight: 600 }}>Settings</h1>
        <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '4px' }}>Integrations and preferences</p>
      </div>

      {/* ── Personalization ── */}
      <Panel title="Personalization">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 500 }}>Daily greeting &amp; affirmation</p>
              <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '2px' }}>
                Shows a motivational message when you open the app each day
              </p>
            </div>
            <Toggle value={greetingEnabled} onChange={toggleGreeting} />
          </div>
        </div>
      </Panel>

      {/* ── Connected Services ── */}
      <Panel title={checking ? 'Connected Services (checking…)' : 'Connected Services'}>
        <div className="flex flex-col">
          {row('Supabase (database)',        'supabase_connection')}
          {row('Groq AI (VELQUOR brain)',    'GROQ_API_KEY')}
          {row('MetaAPI (MT5 sync)',         'METAAPI_TOKEN')}
          {row('Yahoo Finance (portfolio)',  null, true, 'Active')}
          {row('Yahoo Finance (metals)',     null, true, 'Active')}
          {row('Forex Factory (calendar)',   null, true, 'Active')}
        </div>
      </Panel>

      {/* ── Screenshot Storage ── */}
      <Panel title="Screenshot Storage">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <StatusDot ok={health ? health['supabase_connection'] === 'OK' : null} />
            <span style={{ color: 'var(--t2)', fontSize: '12px' }}>
              Supabase Storage — bucket: <code style={{ color: 'var(--ac)', fontSize: '11px' }}>trade-screenshots</code>
            </span>
          </div>
          <p style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: '1.6' }}>
            Screenshots are auto-uploaded when you annotate a trade. Files are stored as PNG/JPG and served via public CDN URLs.
          </p>
        </div>
      </Panel>
    </div>
  )
}
