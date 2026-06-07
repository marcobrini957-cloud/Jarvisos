'use client'

import { useState, useEffect } from 'react'
import Panel from '@/components/ui/Panel'

// ── Theme presets ─────────────────────────────────────────────────────────────

const ACCENT_PRESETS = [
  { name: 'Blue',   value: '#58A6FF' },
  { name: 'Purple', value: '#A371F7' },
  { name: 'Green',  value: '#56D364' },
  { name: 'Gold',   value: '#E3B341' },
  { name: 'Cyan',   value: '#39C5CF' },
  { name: 'Rose',   value: '#F97583' },
]

const BG_THEMES = [
  { name: 'Default',  vars: { '--bg': '#0D1117', '--s1': '#161B22', '--s2': '#1C2230', '--s3': '#21293A' } },
  { name: 'Midnight', vars: { '--bg': '#080B10', '--s1': '#0F1419', '--s2': '#151D28', '--s3': '#1A2535' } },
  { name: 'Soft',     vars: { '--bg': '#11161E', '--s1': '#191F28', '--s2': '#1F2738', '--s3': '#252E40' } },
]

function applyVars(vars: Record<string, string>) {
  Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
}

function saveTheme(key: string, value: unknown) {
  try {
    const saved = JSON.parse(localStorage.getItem('jarvis-theme') ?? '{}')
    localStorage.setItem('jarvis-theme', JSON.stringify({ ...saved, [key]: value }))
  } catch { /* ignore */ }
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

export default function SettingsTab() {
  const [accent,       setAccent]       = useState('#58A6FF')
  const [bgTheme,      setBgTheme]      = useState('Default')
  const [tgEnabled,    setTgEnabled]    = useState(true)
  const [tgTesting,    setTgTesting]    = useState(false)
  const [tgResult,     setTgResult]     = useState<{ ok: boolean; msg: string } | null>(null)
  const [tgConfigured, setTgConfigured] = useState<boolean | null>(null)

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('jarvis-theme') ?? '{}')
      if (saved.accent) { setAccent(saved.accent); applyVars({ '--ac': saved.accent }) }
      if (saved.bgTheme) {
        setBgTheme(saved.bgTheme)
        const theme = BG_THEMES.find(t => t.name === saved.bgTheme)
        if (theme) applyVars(theme.vars)
      }
      if (typeof saved.tgEnabled === 'boolean') setTgEnabled(saved.tgEnabled)
    } catch { /* ignore */ }

    // Check if Telegram is configured by sending a silent test
    fetch('/api/telegram/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '' }) })
      .then(r => r.json())
      .then(d => setTgConfigured(d.error !== 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local'))
      .catch(() => setTgConfigured(false))
  }, [])

  function handleAccent(hex: string) {
    setAccent(hex)
    applyVars({ '--ac': hex })
    saveTheme('accent', hex)
  }

  function handleBgTheme(name: string) {
    setBgTheme(name)
    const theme = BG_THEMES.find(t => t.name === name)
    if (theme) applyVars(theme.vars)
    saveTheme('bgTheme', name)
  }

  async function sendTestMessage() {
    setTgTesting(true); setTgResult(null)
    try {
      const res = await fetch('/api/telegram/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: '✅ *Jarvis OS* — Telegram connected successfully! Morning briefings will appear here.' }),
      })
      const d = await res.json()
      setTgResult(d.ok ? { ok: true, msg: 'Message sent! Check your Telegram.' } : { ok: false, msg: d.error ?? 'Failed' })
    } catch {
      setTgResult({ ok: false, msg: 'Network error' })
    } finally {
      setTgTesting(false)
    }
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
        <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '4px' }}>Appearance, integrations and connected services</p>
      </div>

      {/* ── Appearance ── */}
      <Panel title="Appearance">
        <div className="flex flex-col gap-5">

          {/* Accent color */}
          <div className="flex flex-col gap-2">
            <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Accent Color</label>
            <div className="flex items-center gap-3 flex-wrap">
              {ACCENT_PRESETS.map(p => (
                <button key={p.value} onClick={() => handleAccent(p.value)} title={p.name}
                  className="rounded-full transition-all"
                  style={{
                    width: '28px', height: '28px', background: p.value,
                    border: accent === p.value ? `3px solid var(--t1)` : '3px solid transparent',
                    cursor: 'pointer', outline: 'none',
                    boxShadow: accent === p.value ? `0 0 0 1px ${p.value}` : 'none',
                  }} />
              ))}
              {/* Custom color input */}
              <label title="Custom color" style={{ cursor: 'pointer', position: 'relative' }}>
                <div className="rounded-full flex items-center justify-center"
                  style={{ width: '28px', height: '28px', border: '2px dashed var(--bd2)', background: 'var(--s2)' }}>
                  <span style={{ fontSize: '14px', color: 'var(--t3)' }}>+</span>
                </div>
                <input type="color" value={accent} onChange={e => handleAccent(e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: '28px', height: '28px', top: 0, left: 0, cursor: 'pointer' }} />
              </label>
              <span style={{ color: 'var(--t3)', fontSize: '11px', marginLeft: '4px' }}>Current: {accent}</span>
            </div>
          </div>

          {/* Background theme */}
          <div className="flex flex-col gap-2">
            <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Background</label>
            <div className="flex gap-2">
              {BG_THEMES.map(t => (
                <button key={t.name} onClick={() => handleBgTheme(t.name)}
                  className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg"
                  style={{
                    border: bgTheme === t.name ? '1px solid var(--ac)' : '1px solid var(--bd2)',
                    background: bgTheme === t.name ? 'rgba(88,166,255,0.08)' : 'var(--s2)',
                    cursor: 'pointer',
                  }}>
                  <div className="rounded" style={{ width: '32px', height: '20px', background: t.vars['--bg'], border: `2px solid ${t.vars['--s2']}` }} />
                  <span style={{ color: bgTheme === t.name ? 'var(--ac)' : 'var(--t2)', fontSize: '11px' }}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Telegram ── */}
      <Panel title="Telegram Alerts">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 500 }}>Morning Briefing</p>
              <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '2px' }}>Send Jarvis macro briefing to Telegram after generating it</p>
            </div>
            <button onClick={() => { setTgEnabled(v => !v); saveTheme('tgEnabled', !tgEnabled) }}
              className="rounded-full transition-all"
              style={{
                width: '44px', height: '24px', padding: '0 2px',
                background: tgEnabled ? 'var(--ac)' : 'var(--s3)',
                border: 'none', cursor: 'pointer', position: 'relative',
              }}>
              <span style={{
                display: 'block', width: '20px', height: '20px', borderRadius: '50%',
                background: 'white', transition: 'transform 0.2s',
                transform: tgEnabled ? 'translateX(20px)' : 'translateX(0)',
              }} />
            </button>
          </div>

          {/* Status + test */}
          <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: 'var(--s2)', border: '1px solid var(--bd2)' }}>
            <div className="flex items-center gap-2">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tgConfigured === null ? 'var(--am2)' : tgConfigured ? 'var(--gr2)' : 'var(--re)', display: 'inline-block' }} />
              <span style={{ color: 'var(--t2)', fontSize: '12px' }}>
                {tgConfigured === null ? 'Checking…' : tgConfigured ? 'Bot token configured' : 'Not configured — set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env.local'}
              </span>
            </div>
            {tgConfigured && (
              <button onClick={sendTestMessage} disabled={tgTesting}
                style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '6px', cursor: tgTesting ? 'not-allowed' : 'pointer',
                  background: 'rgba(88,166,255,0.12)', border: '1px solid rgba(88,166,255,0.25)', color: 'var(--ac)' }}>
                {tgTesting ? 'Sending…' : 'Send test message'}
              </button>
            )}
          </div>

          {tgResult && (
            <p style={{ fontSize: '12px', color: tgResult.ok ? 'var(--gr2)' : 'var(--re)',
              background: tgResult.ok ? 'rgba(56,211,100,0.08)' : 'rgba(248,81,73,0.08)',
              border: `1px solid ${tgResult.ok ? 'rgba(56,211,100,0.2)' : 'rgba(248,81,73,0.2)'}`,
              padding: '8px 12px', borderRadius: '6px' }}>
              {tgResult.msg}
            </p>
          )}
        </div>
      </Panel>

      {/* ── Screenshot Storage ── */}
      <Panel title="Screenshot Storage">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gr2)', display: 'inline-block' }} />
            <span style={{ color: 'var(--t2)', fontSize: '12px' }}>Supabase Storage — bucket: <code style={{ color: 'var(--ac)', fontSize: '11px' }}>trade-screenshots</code></span>
          </div>
          <p style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: '1.6' }}>
            Screenshots are auto-uploaded when you annotate a trade. The bucket is created automatically on first upload.
            Files are stored as PNG/JPG and served via public CDN URLs.
          </p>
        </div>
      </Panel>

      {/* ── Connected Services ── */}
      <Panel title="Connected Services">
        <div className="flex flex-col">
          {row('Supabase (database)',         'Connected', 'var(--gr2)')}
          {row('Anthropic Claude (Haiku)',     'Active',    'var(--gr2)')}
          {row('MetaAPI (MT5 sync)',           'Configured','var(--ac)')}
          {row('Yahoo Finance (portfolio)',    'Active',    'var(--gr2)')}
          {row('gold-api.com (metals)',        'Active',    'var(--gr2)')}
          {row('Frankfurter (EUR/USD)',        'Active',    'var(--gr2)')}
          {row('Forex Factory (calendar)',     'Active',    'var(--gr2)')}
          {row('Telegram Bot',                tgConfigured === null ? 'Checking…' : tgConfigured ? 'Connected' : 'Not configured', tgConfigured ? 'var(--gr2)' : 'var(--re)')}
        </div>
      </Panel>
    </div>
  )
}
