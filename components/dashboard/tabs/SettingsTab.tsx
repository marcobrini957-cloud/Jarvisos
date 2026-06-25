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

export default function SettingsTab() {
  const [greetingEnabled, setGreetingEnabled] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(KEY_ENABLED)
    setGreetingEnabled(stored !== 'false')
  }, [])

  function toggleGreeting(val: boolean) {
    setGreetingEnabled(val)
    localStorage.setItem(KEY_ENABLED, String(val))
    if (val) localStorage.removeItem(KEY_DATE)
  }

  const row = (label: string, value: string, color = 'var(--t2)') => (
    <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--bd)' }}>
      <span style={{ color: 'var(--t2)', fontSize: '12px' }}>{label}</span>
      <span style={{ color, fontSize: '12px', fontWeight: 500 }}>{value}</span>
    </div>
  )

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
      <Panel title="Connected Services">
        <div className="flex flex-col">
          {row('Supabase (database)',       'Connected',  'var(--gr2)')}
          {row('Anthropic Claude',          'Active',     'var(--gr2)')}
          {row('MetaAPI (MT5 sync)',         'Configured', 'var(--ac)')}
          {row('Yahoo Finance (portfolio)', 'Active',     'var(--gr2)')}
          {row('gold-api.com (metals)',     'Active',     'var(--gr2)')}
          {row('open.er-api.com (FX)',      'Active',     'var(--gr2)')}
          {row('Forex Factory (calendar)',  'Active',     'var(--gr2)')}
        </div>
      </Panel>

      {/* ── Screenshot Storage ── */}
      <Panel title="Screenshot Storage">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gr2)', display: 'inline-block' }} />
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
