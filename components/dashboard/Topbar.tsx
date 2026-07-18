'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MT5ConnectModal from './MT5ConnectModal'
import AccountMenu from './AccountMenu'
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

const AVATAR_COLORS = [
  { label: 'Blue',   value: 'var(--ac)'  },
  { label: 'Green',  value: 'var(--gr2)' },
  { label: 'Gold',   value: 'var(--go2)' },
  { label: 'Purple', value: 'var(--pu)'  },
  { label: 'Red',    value: 'var(--re)'  },
  { label: 'Cyan',   value: 'var(--cy2)' },
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
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(profile.avatar_url ?? null)
  const [uploading,    setUploading]    = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)

  // Sync edit state when profile changes
  useEffect(() => {
    setEditName(profile.display_name)
    setEditTz(profile.timezone)
    setEditCurrency(profile.currency)
    setEditColor(profile.avatar_color)
    setAvatarUrl(profile.avatar_url ?? null)
  }, [profile])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2 MB')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch('/api/user/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        setAvatarUrl(data.url)
        updateProfile({ avatar_url: data.url })
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemovePhoto() {
    setUploading(true)
    try {
      await fetch('/api/user/avatar', { method: 'DELETE' })
      setAvatarUrl(null)
      updateProfile({ avatar_url: null })
    } finally {
      setUploading(false)
    }
  }

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
    await updateProfile({ display_name: editName, avatar_color: editColor, timezone: editTz, currency: editCurrency })
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


  const avatarLetter = (profile.display_name || 'T')[0].toUpperCase()

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

        {/* MT5 status pill + account switcher */}
        <AccountMenu
          status={status}
          syncing={syncing}
          onSync={() => runSync(true)}
          onConnect={() => setShowModal(true)}
        />

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
              background: avatarUrl ? 'transparent' : profile.avatar_color,
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', color: 'white', fontWeight: 700,
              flexShrink: 0, cursor: 'pointer', overflow: 'hidden',
              border: showDropdown ? '2px solid rgba(255,255,255,0.2)' : '2px solid transparent',
              transition: 'border-color 0.12s',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : avatarLetter
              }
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

              {/* Profile photo */}
              <div>
                <label style={{ display: 'block', color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Profile Photo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Photo preview */}
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{
                      width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0,
                      background: avatarUrl ? 'transparent' : editColor,
                      border: '1.5px solid var(--bd2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', cursor: uploading ? 'default' : 'pointer',
                      position: 'relative', transition: 'opacity 0.15s',
                      opacity: uploading ? 0.6 : 1,
                    }}
                  >
                    {avatarUrl
                      ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '20px', color: 'white', fontWeight: 700 }}>{avatarLetter}</span>
                    }
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.15s',
                      fontSize: '18px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                    >
                      {uploading ? '…' : '📷'}
                    </div>
                  </div>

                  {/* Upload / remove buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        padding: '7px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 500,
                        background: 'var(--s3)', border: '1px solid var(--bd2)',
                        color: 'var(--t1)', cursor: uploading ? 'default' : 'pointer',
                        opacity: uploading ? 0.6 : 1, transition: 'all 0.12s',
                      }}
                    >
                      {uploading ? 'Uploading…' : 'Upload photo'}
                    </button>
                    {avatarUrl && (
                      <button
                        onClick={handleRemovePhoto}
                        disabled={uploading}
                        style={{
                          padding: '7px 12px', borderRadius: '7px', fontSize: '12px',
                          background: 'transparent', border: '1px solid rgba(255,61,80,0.2)',
                          color: 'var(--re)', cursor: 'pointer', transition: 'all 0.12s',
                        }}
                      >
                        Remove
                      </button>
                    )}
                    <p style={{ color: 'var(--t3)', fontSize: '10px', margin: 0 }}>Max 2 MB · JPG or PNG</p>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              </div>

              {/* Fallback letter color (when no photo) */}
              {!avatarUrl && (
                <div>
                  <label style={{ display: 'block', color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Accent Color
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c.value}
                        title={c.label}
                        onClick={() => setEditColor(c.value)}
                        style={{
                          width: '24px', height: '24px', borderRadius: '6px',
                          background: c.value, border: 'none', cursor: 'pointer', flexShrink: 0,
                          outline: editColor === c.value ? '2px solid var(--t1)' : '2px solid transparent',
                          outlineOffset: '2px', transition: 'outline 0.1s',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

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
          onConnected={() => setTimeout(() => runSync(true), 5000)}
          isConnected={status.connected}
        />
      )}
    </>
  )
}
