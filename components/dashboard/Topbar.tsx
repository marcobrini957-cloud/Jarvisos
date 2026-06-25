'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MT5ConnectModal from './MT5ConnectModal'
import { LogoMark } from '@/components/ui/LogoMark'
import { useDisplayMode } from '@/context/DisplayModeContext'
import { useUserProfile } from '@/context/UserProfileContext'
import { createClient } from '@/lib/supabase/client'

interface MT5Status {
  connected:     boolean
  balance:       number | null
  equity:        number | null
  openPositions: number
  syncedAt:      string | null
  error:         string | null
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const AVATAR_COLORS = [
  { label: 'Blue',   value: 'var(--ac)'  },
  { label: 'Green',  value: 'var(--gr2)' },
  { label: 'Gold',   value: 'var(--go2)' },
  { label: 'Purple', value: 'var(--pu)'  },
  { label: 'Red',    value: 'var(--re)'  },
  { label: 'Cyan',   value: 'var(--cy2)' },
]

const FREE_EMOJIS = ['📈','🎯','🧠','⚡','🌊','🦊','🐯','🦅','🐻','🌙','☀️','🎲','🌍','💼','🔑','🗡️']

const LOCKED_EMOJIS: { emoji: string; label: string; condition: string }[] = [
  { emoji: '🔥', label: 'On Fire',      condition: 'Win streak of 5+ trades'        },
  { emoji: '💎', label: 'Diamond',      condition: '€500+ monthly profit'            },
  { emoji: '👑', label: 'Crown',        condition: '100+ total trades'               },
  { emoji: '🏆', label: 'Champion',     condition: '65%+ win rate over 50+ trades'  },
  { emoji: '🚀', label: 'Rocket',       condition: '€200+ best day'                 },
  { emoji: '🌟', label: 'Consistent',   condition: '7-day journal streak'           },
]

const TIMEZONES = [
  'Europe/Vienna',
  'Europe/London',
  'America/New_York',
  'Asia/Tokyo',
]

const CURRENCIES = ['EUR', 'USD', 'GBP']

export default function Topbar() {
  const router = useRouter()
  const { displayMode, toggleDisplayMode } = useDisplayMode()
  const { profile, updateProfile } = useUserProfile()

  const [showModal,    setShowModal]    = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [status,       setStatus]       = useState<MT5Status>({
    connected: false, balance: null, equity: null,
    openPositions: 0, syncedAt: null, error: null,
  })
  const [syncing, setSyncing] = useState(false)
  const [, setTick]           = useState(0)
  const syncingRef            = useRef(false)

  // Dropdown edit state
  const [editName,     setEditName]     = useState(profile.display_name)
  const [editTz,       setEditTz]       = useState(profile.timezone)
  const [editCurrency, setEditCurrency] = useState(profile.currency)
  const [editColor,    setEditColor]    = useState(profile.avatar_color)
  const [editEmoji,    setEditEmoji]    = useState<string | null>(profile.avatar_emoji ?? null)
  const [unlockedEmojis, setUnlockedEmojis] = useState<string[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync edit state when profile changes
  useEffect(() => {
    setEditName(profile.display_name)
    setEditTz(profile.timezone)
    setEditCurrency(profile.currency)
    setEditColor(profile.avatar_color)
    setEditEmoji(profile.avatar_emoji ?? null)
  }, [profile])

  // Fetch unlocked emojis when dropdown opens
  useEffect(() => {
    if (!showDropdown) return
    fetch('/api/user/avatar-unlocks')
      .then(r => r.json())
      .then(d => setUnlockedEmojis(d.unlocked ?? []))
      .catch(() => {})
  }, [showDropdown])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function handleSaveProfile() {
    await updateProfile({ display_name: editName, avatar_color: editColor, avatar_emoji: editEmoji, timezone: editTz, currency: editCurrency })
    setShowDropdown(false)
  }

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000)
    return () => clearInterval(id)
  }, [])

  const runSync = useCallback(async (quick = true) => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const res  = await fetch(`/api/mt5-sync?quick=${quick}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setStatus({
          connected: true, balance: data.balance, equity: data.equity,
          openPositions: data.openPositions, syncedAt: data.syncedAt, error: null,
        })
        window.dispatchEvent(new CustomEvent('mt5-synced'))
      } else {
        setStatus(prev => ({ ...prev, connected: prev.connected, error: data.error ?? 'Sync error' }))
      }
    } catch {
      setStatus(prev => ({ ...prev, error: 'Sync failed — showing cached data' }))
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return
    fetch('/api/mt5-sync')
      .then(r => r.json())
      .then((d: { snapshot?: { balance: number; equity: number; open_trades_count?: number; snapshot_at: string } }) => {
        if (d.snapshot) {
          setStatus({
            connected:     true,
            balance:       d.snapshot.balance,
            equity:        d.snapshot.equity,
            openPositions: d.snapshot.open_trades_count ?? 0,
            syncedAt:      d.snapshot.snapshot_at,
            error:         null,
          })
        }
      })
      .catch(() => {})

    const t = setTimeout(() => runSync(true), 3000)
    const q = setInterval(() => runSync(true), 30 * 1000)        // quick sync every 30s
    const i = setInterval(() => runSync(false), 60 * 60 * 1000)  // deep sync hourly
    return () => { clearTimeout(t); clearInterval(q); clearInterval(i) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSaveCredentials(data: { accountId: string; investorPassword: string; server: string }) {
    const res = await fetch('/api/user/mt5-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
    setTimeout(runSync, 500)
  }

  const avatarLetter  = (profile.display_name || 'T')[0].toUpperCase()
  const avatarEmoji   = profile.avatar_emoji ?? null

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--s2)',
    border: '1px solid var(--bd2)',
    borderRadius: '7px',
    padding: '8px 10px',
    color: 'var(--t1)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <>
      <div
        className="topbar-root flex items-center justify-between flex-shrink-0"
        style={{
          height: '48px',
          padding: '0 20px',
          background: 'linear-gradient(180deg, var(--s2) 0%, var(--s1) 100%)',
          borderBottom: '1px solid var(--bd2)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.55)',
        }}
      >
        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <LogoMark size={26} />
          <span className="topbar-brand-text" style={{ color: 'var(--t1)', fontWeight: 700, fontSize: '13px', letterSpacing: '-0.01em' }}>
            Velquor
          </span>
        </Link>

        {/* MT5 Status */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: 'transparent',
            border: '1px solid var(--bd2)',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: status.connected ? 'var(--gr2)' : status.error ? 'var(--re)' : 'var(--t3)',
            boxShadow:  status.connected ? '0 0 6px var(--gr)' : 'none',
            animation:  syncing ? 'pulse-dot 1s ease-in-out infinite' : 'none',
          }} />

          {status.connected ? (
            <div className="flex items-center gap-3">
              <span className="topbar-mt5-label" style={{ color: 'var(--t2)', fontSize: '12px' }}>MT5</span>
              {status.balance !== null && (
                <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500 }}>
                  €{status.balance.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              {status.openPositions > 0 && (
                <span className="topbar-mt5-open" style={{
                  background: 'rgba(88,166,255,0.12)', color: 'var(--ac)',
                  fontSize: '11px', padding: '1px 7px', borderRadius: '4px',
                }}>
                  {status.openPositions} open
                </span>
              )}
              {status.syncedAt && (
                <span className="topbar-mt5-time" style={{ color: 'var(--t3)', fontSize: '11px' }}>{timeAgo(status.syncedAt)}</span>
              )}
            </div>
          ) : status.error ? (
            <span style={{ color: 'var(--re)', fontSize: '12px' }}>Reconnect MT5</span>
          ) : (
            <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Connect MT5</span>
          )}
        </button>

        {/* Display mode toggle */}
        <button
          onClick={toggleDisplayMode}
          title={displayMode === 'pct' ? 'Switch to EUR values' : 'Switch to % values'}
          style={{
            width: '32px', height: '28px',
            background: 'var(--s2)',
            border: '1px solid var(--bd2)',
            borderRadius: '7px',
            color: 'var(--t2)',
            fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.12s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--s2)'; e.currentTarget.style.color = 'var(--t2)' }}
        >
          {displayMode === 'pct' ? '€' : '%'}
        </button>

        {/* User avatar + dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            className="flex items-center gap-2"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowDropdown(v => !v)}
          >
            {/* Avatar circle */}
            <div style={{
              width: '28px', height: '28px',
              background: avatarEmoji ? 'var(--s3)' : profile.avatar_color,
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: avatarEmoji ? '17px' : '12px',
              color: 'white', fontWeight: 700,
              flexShrink: 0, cursor: 'pointer',
              border: showDropdown ? '2px solid rgba(255,255,255,0.2)' : '2px solid transparent',
              transition: 'border-color 0.12s',
            }}>
              {avatarEmoji ?? avatarLetter}
            </div>
            <div className="hidden sm:flex flex-col" style={{ lineHeight: 1.2 }}>
              <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500 }}>{profile.display_name}</span>
              <span style={{ color: '#686868', fontSize: '10px' }}>{profile.timezone.split('/')[1]?.replace('_', ' ')} · {profile.currency}</span>
            </div>
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: '280px', zIndex: 50,
              background: 'var(--s2)',
              border: '1px solid var(--bd2)',
              borderRadius: '12px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              {/* Display name */}
              <div>
                <label style={{ display: 'block', color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Display Name
                </label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
                />
              </div>

              {/* Avatar emoji picker */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Avatar
                  </label>
                  {editEmoji && (
                    <button
                      onClick={() => setEditEmoji(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '10px', cursor: 'pointer', padding: 0 }}
                    >
                      ✕ clear
                    </button>
                  )}
                </div>

                {/* Free emojis */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', marginBottom: '10px' }}>
                  {FREE_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setEditEmoji(editEmoji === e ? null : e)}
                      title={e}
                      style={{
                        width: '30px', height: '30px', borderRadius: '7px', fontSize: '17px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: editEmoji === e ? 'var(--s3)' : 'transparent',
                        border: editEmoji === e ? '1.5px solid var(--ac)' : '1px solid transparent',
                        cursor: 'pointer', transition: 'all 0.1s',
                      }}
                      onMouseEnter={e2 => { if (editEmoji !== e) e2.currentTarget.style.background = 'var(--s2)' }}
                      onMouseLeave={e2 => { if (editEmoji !== e) e2.currentTarget.style.background = 'transparent' }}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                {/* Unlockable emojis */}
                <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
                  Earn by trading
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginBottom: '10px' }}>
                  {LOCKED_EMOJIS.map(({ emoji, label, condition }) => {
                    const isUnlocked = unlockedEmojis.includes(emoji)
                    return (
                      <div key={emoji} style={{ position: 'relative' }} title={isUnlocked ? `${label} — Unlocked!` : `${label}: ${condition}`}>
                        <button
                          onClick={() => isUnlocked && setEditEmoji(editEmoji === emoji ? null : emoji)}
                          style={{
                            width: '30px', height: '30px', borderRadius: '7px', fontSize: '17px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: editEmoji === emoji ? 'var(--s3)' : 'transparent',
                            border: editEmoji === emoji ? '1.5px solid var(--go2)' : '1px solid transparent',
                            cursor: isUnlocked ? 'pointer' : 'default',
                            opacity: isUnlocked ? 1 : 0.35,
                            transition: 'all 0.1s', position: 'relative',
                            filter: isUnlocked ? 'none' : 'grayscale(0.6)',
                          }}
                        >
                          {emoji}
                          {!isUnlocked && (
                            <span style={{ position: 'absolute', bottom: '1px', right: '1px', fontSize: '8px', lineHeight: 1 }}>🔒</span>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Color accent (when no emoji or as fallback) */}
                {!editEmoji && (
                  <div>
                    <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
                      Letter color
                    </p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {AVATAR_COLORS.map(c => (
                        <button
                          key={c.value}
                          title={c.label}
                          onClick={() => setEditColor(c.value)}
                          style={{
                            width: '22px', height: '22px', borderRadius: '5px',
                            background: c.value, border: 'none', cursor: 'pointer', flexShrink: 0,
                            outline: editColor === c.value ? '2px solid var(--t1)' : '2px solid transparent',
                            outlineOffset: '2px', transition: 'outline 0.1s',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timezone */}
              <div>
                <label style={{ display: 'block', color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Timezone
                </label>
                <select
                  value={editTz}
                  onChange={e => setEditTz(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div>
                <label style={{ display: 'block', color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Currency
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {CURRENCIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditCurrency(c)}
                      style={{
                        flex: 1, padding: '6px 0',
                        borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        background: editCurrency === c ? 'var(--ac)' : 'var(--s3)',
                        border: editCurrency === c ? '1px solid var(--ac)' : '1px solid var(--bd2)',
                        color: editCurrency === c ? 'white' : 'var(--t2)',
                        transition: 'all 0.1s',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSaveProfile}
                style={{
                  width: '100%', padding: '9px',
                  background: 'var(--ac)', border: 'none', borderRadius: '8px',
                  color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  transition: 'opacity 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Save
              </button>

              {/* Divider + sign out */}
              <div style={{ height: '1px', background: 'var(--bd)' }} />
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '8px',
                  background: 'transparent', border: '1px solid rgba(255,51,71,0.2)',
                  borderRadius: '8px', color: 'var(--re)', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,51,71,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <MT5ConnectModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveCredentials}
          isConnected={status.connected}
        />
      )}
    </>
  )
}
