'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Panel from '@/components/ui/Panel'
import Icon from '@/components/ui/Icon'
import { Button } from '@/components/ui/vq'
import { useUserProfile } from '@/context/UserProfileContext'
import { BE_PIPS, BE_PIPS_MIN, BE_PIPS_MAX } from '@/lib/trading/stats'

const KEY_ENABLED = 'vq_greeting_enabled'

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '40px', height: '22px', borderRadius: 'var(--radius-md)',
        background: value ? 'rgba(255,255,255,0.8)' : 'var(--s3)',
        border: `1px solid ${value ? 'rgba(255,255,255,0.5)' : 'var(--bd2)'}`,
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
  const color = ok === null ? 'var(--color-ink-4)' : ok ? 'var(--color-up)' : 'var(--color-down)'
  return (
    <span style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: color,
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
          padding: '12px 14px', borderRadius: 'var(--radius-md)',
          background: connected ? 'rgba(0,196,106,0.06)' : 'var(--s3)',
          border: `1px solid ${connected ? 'rgba(0,196,106,0.2)' : 'var(--bd2)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Dot ok={status === null ? null : connected} />
            <div>
              <p style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: connected ? 'var(--color-up)' : 'var(--color-ink-2)' }}>
                {status === null
                  ? 'Checking…'
                  : connected
                    ? `Connected${status?.ea_broker ? ` · ${status.ea_broker}` : ''}`
                    : 'EA not connected'}
              </p>
              {connected && status && (status.ea_version || lastSeenTs) && (
                <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
                  {[status.ea_version ? `v${status.ea_version}` : null, lastSeenTs ? `last sync ${lastSeenTs}` : null]
                    .filter(Boolean).join(' · ')}
                </p>
              )}
              {!connected && status !== null && (
                <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
                  Install the EA and attach it to any chart in MT5
                </p>
              )}
            </div>
          </div>

          {/* Setup guide */}
          <Link href="/connect" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Button variant={connected ? 'secondary' : 'primary'} size="sm">
              {connected ? 'Add account' : 'Connect MT5'}
            </Button>
          </Link>
        </div>

        {/* ── API Key ──────────────────────────────────────────────────────── */}
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--t3)' }}>
            API KEY — paste this into the EA inputs when you attach it
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--s2)', border: '1px solid var(--bd2)',
            borderRadius: 'var(--radius-md)', padding: '9px 12px',
          }}>
            <code style={{
              flex: 1, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)',
              color: 'var(--t1)', wordBreak: 'break-all',
            }}>
              {status ? status.api_key : '…'}
            </code>
            <Button
              onClick={copyKey}
              disabled={!status?.api_key}
              size="sm"
              variant="secondary"
              style={copied ? { color: 'var(--color-up)', borderColor: 'var(--color-up-dim)' } : undefined}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
            Keep this private — it gives write access to your VELQUOR data.
          </p>
        </div>

        {/* ── Setup guide ───────────────────────────────────────────────────── */}
        {/* A drawn chevron, not a ▶ — a glyph doing an icon's job is on the
            ban list, and it inherits the text face rather than the icon set. */}
        <Link
          href="/connect"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start',
            color: 'var(--color-ink-2)', fontSize: 'var(--text-base)', textDecoration: 'none',
          }}
        >
          Step-by-step setup guide <Icon name="chevronRight" size={13} />
        </Link>
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
  const { profile, updateProfile } = useUserProfile()
  const [bePips,      setBePips]      = useState(profile.be_pips ?? BE_PIPS)
  const [bePipsSaved, setBePipsSaved] = useState(false)

  // Follow the profile once it has loaded, but never fight the user's drag.
  const dragging = useRef(false)
  useEffect(() => { if (!dragging.current) setBePips(profile.be_pips ?? BE_PIPS) }, [profile.be_pips])

  const saveBePips = useCallback(async (v: number) => {
    dragging.current = false
    if (v === profile.be_pips) return
    await updateProfile({ be_pips: v })
    setBePipsSaved(true)
    setTimeout(() => setBePipsSaved(false), 2500)
  }, [profile.be_pips, updateProfile])

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

  /** A service we have no live probe for — it either answers per request or not. */
  function staticRow(label: string, last = false) {
    return (
      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: last ? undefined : '1px solid var(--bd)' }}>
        <span style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Dot ok={true} />
          <span style={{ color: 'var(--color-up)', fontSize: 'var(--text-base)' }}>Active</span>
        </div>
      </div>
    )
  }

  function healthRow(label: string, key: string) {
    const { text, ok } = health ? statusLabel(health[key]) : { text: 'Checking…', ok: false }
    return (
      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
        <span style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Dot ok={health ? ok : null} />
          <span style={{ color: ok ? 'var(--color-up)' : health ? 'var(--color-down)' : 'var(--color-ink-3)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{text}</span>
        </div>
      </div>
    )
  }

  return (
    // Two columns, because one 760px column on a 1440px screen left more than
    // half the page empty and made the section look unfinished next to every
    // other tab. The header says "Settings" already — a page that repeats its
    // own name under the title it was given is one heading too many.
    <div
      className="vq-settings-grid"
      style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '12px', alignItems: 'start',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
        {/* ── MT5 Accounts ── */}
        <MT5AccountsPanel />

        {/* ── System status ──────────────────────────────────────────────────
            Capabilities, not suppliers. This panel used to read "Supabase",
            "Groq AI", "Yahoo Finance", "Forex Factory" — our vendor list, shown
            to every user. Which services we buy is not their concern, it tells
            them nothing about whether the product is working, and it goes stale
            the day one is swapped. The real names live in the admin console. */}
        <Panel title={checking ? 'System status (checking…)' : 'System status'}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {healthRow('Database', 'database')}
            {healthRow('VELQUOR AI', 'ai')}
            {staticRow('Portfolio & metals prices')}
            {staticRow('Economic calendar', true)}
          </div>
        </Panel>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>

      {/* ── Personalization ── */}
      <Panel title="Personalization">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'var(--t1)', fontSize: 'var(--text-base)', fontWeight: 500, margin: 0 }}>Daily greeting &amp; affirmation</p>
            <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', marginTop: '2px' }}>
              Shows a motivational message when you open the app each day
            </p>
          </div>
          <Toggle value={greetingEnabled} onChange={toggleGreeting} />
        </div>
      </Panel>

      {/* ── Tour ── */}
      <Panel title="Getting started">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <p style={{ color: 'var(--t1)', fontSize: 'var(--text-base)', fontWeight: 500, margin: 0 }}>Show the tour again</p>
            <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', marginTop: '2px', lineHeight: 1.6 }}>
              The walkthrough of each section. Easy to dismiss by reflex on day one.
            </p>
          </div>
          <Button
            style={{ flexShrink: 0 }}
            onClick={async () => {
              await fetch('/api/user/tour', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'replay' }),
              }).catch(() => {})
              window.dispatchEvent(new CustomEvent('vq-replay-tour'))
            }}
          >
            Replay tour
          </Button>
        </div>
      </Panel>

      {/* ── How a trade is scored ──
          This is the one number that changes what every win rate, streak and
          calendar colour in the product means, so it is stated in plain terms
          and its effect is shown live rather than left to be discovered. */}
      <Panel title="Break-even">
        <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', margin: '0 0 4px', lineHeight: 1.6 }}>
          A trade that moves less than this counts as a scratch — neither a win
          nor a loss — and is left out of your win rate entirely.
        </p>
        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', margin: '0 0 16px', lineHeight: 1.6 }}>
          Measured in pips, not euros, so it means the same thing whatever size
          you trade: {bePips} pips is{' '}
          <span className="vq-num">€{(bePips * 0.1).toFixed(2)}</span> at 0.01 lots and{' '}
          <span className="vq-num">€{(bePips * 10).toFixed(0)}</span> at a full lot.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <input
            type="range"
            min={BE_PIPS_MIN}
            max={BE_PIPS_MAX}
            value={bePips}
            onChange={e => { dragging.current = true; setBePips(Number(e.target.value)) }}
            onPointerUp={() => saveBePips(bePips)}
            onKeyUp={() => saveBePips(bePips)}
            style={{ flex: 1, accentColor: 'var(--color-ink-1)' }}
            aria-label="Break-even distance in pips"
          />
          <span className="vq-num" style={{
            color: 'var(--color-ink-1)', fontSize: 'var(--text-lg)', fontWeight: 700,
            minWidth: '62px', textAlign: 'right',
          }}>
            {bePips} pip{bePips === 1 ? '' : 's'}
          </span>
        </div>

        {bePipsSaved && (
          <p style={{ color: 'var(--color-up)', fontSize: 'var(--text-sm)', marginTop: '10px' }}>
            Saved — your figures have been recalculated.
          </p>
        )}
      </Panel>

      </div>
    </div>
  )
}
