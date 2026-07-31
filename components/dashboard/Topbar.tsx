'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MT5ConnectModal from './MT5ConnectModal'
import AccountMenu from './AccountMenu'
import { LogoMark } from '@/components/ui/LogoMark'
import { MobileMenuButton } from './MobileNav'
import { useDisplayMode } from '@/context/DisplayModeContext'
import { useUserProfile } from '@/context/UserProfileContext'
import { createClient } from '@/lib/supabase/client'
import { Label, Num, Segmented, Select } from '@/components/ui/vq'

interface MT5Status {
  connected:     boolean
  balance:       number | null
  equity:        number | null
  openPositions: number
  syncedAt:      string | null
  error:         string | null
}

const TIMEZONES = [
  'Europe/Vienna',
  'Europe/London',
  'America/New_York',
  'Asia/Tokyo',
]

const CURRENCIES = ['EUR', 'USD', 'GBP'] as const

interface TopbarProps {
  /** Mobile menu wiring — absent on screens that use the desktop tab bar. */
  menuOpen?:     boolean
  onMenuToggle?: () => void
  /** Name of the section currently on screen, shown on mobile in place of the wordmark. */
  sectionLabel?: string
}

export default function Topbar({ menuOpen = false, onMenuToggle, sectionLabel }: TopbarProps = {}) {
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
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(profile.avatar_url ?? null)
  const [uploading,    setUploading]    = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)

  // Sync edit state when profile changes
  useEffect(() => {
    setEditName(profile.display_name)
    setEditTz(profile.timezone)
    setEditCurrency(profile.currency)
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
    await updateProfile({ display_name: editName, timezone: editTz, currency: editCurrency })
    setShowDropdown(false)
  }

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000)
    return () => clearInterval(id)
  }, [])

  /**
   * Read the account pill from the newest snapshot.
   *
   * This used to POST /api/mt5-sync?quick=true every 30 seconds — the legacy
   * MetaAPI pull. Accounts now reach us the other way round: the EA or a cloud
   * terminal pushes to the bridge, which writes account_snapshots, and the GET
   * below reads it. For anyone without MetaAPI credentials — which is every
   * user who signed up after Instant Connect — the POST could only fail, so a
   * brand-new account was met by a red "Reconnect MT5" before it had ever
   * connected anything.
   *
   * `connected` now means "we have a snapshot for you". How fresh it is shows
   * as the timestamp beside the balance, which is the honest way to say it.
   */
  const runSync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const res = await fetch('/api/mt5-sync')
      const d = await res.json() as {
        snapshot?: { balance: number; equity: number; open_trades_count?: number; snapshot_at: string } | null
      }
      if (d.snapshot) {
        setStatus({
          connected:     true,
          balance:       d.snapshot.balance,
          equity:        d.snapshot.equity,
          openPositions: d.snapshot.open_trades_count ?? 0,
          syncedAt:      d.snapshot.snapshot_at,
          error:         null,
        })
        window.dispatchEvent(new CustomEvent('mt5-synced'))
      } else {
        // No snapshot is not an error — it is an account that has not been
        // connected yet, and the pill says "Connect MT5".
        setStatus(prev => ({ ...prev, connected: false, error: null }))
      }
    } catch {
      setStatus(prev => ({ ...prev, error: 'Could not reach VELQUOR — showing cached data' }))
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return
    runSync()
    const q = setInterval(runSync, 30 * 1000)
    return () => clearInterval(q)
  }, [runSync])


  const avatarLetter = (profile.display_name || 'T')[0].toUpperCase()

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-line-1)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 9px',
    color: 'var(--color-ink-1)',
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const ghostButton: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
    background: 'var(--color-surface-2)', border: '1px solid var(--color-line-1)',
    color: 'var(--color-ink-1)', cursor: 'pointer', transition: 'background 0.12s',
  }

  return (
    <>
      <div
        className="topbar-root flex items-center justify-between flex-shrink-0"
        style={{
          height: '40px',
          padding: '0 12px',
          background: 'var(--color-void)',
          borderBottom: '1px solid var(--color-line-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
          {/* Mobile navigation lives here now — the bottom bar is gone. */}
          {onMenuToggle && (
            <div className="sm:hidden">
              <MobileMenuButton open={menuOpen} onToggle={onMenuToggle} />
            </div>
          )}

          {/* Wordmark — Coolvetica Heavy Compressed, the one place it appears */}
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', minWidth: 0 }}>
            <LogoMark size={20} />
            <span className="topbar-brand-text" style={{
              fontFamily: 'var(--font-mark)', fontSize: 'var(--text-lg)', lineHeight: 1,
              letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-ink-1)',
            }}>
              Velquor
            </span>
          </Link>

          {/* Where you are. Without the tab bar, mobile had no answer to that
              question — the screen just changed under you. */}
          {sectionLabel && (
            <span className="topbar-section sm:hidden" style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--color-ink-3)', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {sectionLabel}
            </span>
          )}
        </div>

        {/* MT5 status pill + account switcher */}
        <AccountMenu
          status={status}
          syncing={syncing}
          onSync={() => runSync()}
          onConnect={() => setShowModal(true)}
        />

        {/* Display mode toggle */}
        <button
          onClick={toggleDisplayMode}
          title={displayMode === 'pct' ? 'Switch to EUR values' : 'Switch to % values'}
          className="vq-num"
          style={{
            width: '26px', height: '24px',
            background: 'transparent',
            border: '1px solid var(--color-line-1)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-ink-3)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'all 0.12s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-state-hover)'; e.currentTarget.style.color = 'var(--color-ink-1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-ink-3)' }}
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
            {/* Avatar — a tile, not a coloured disc. The old accent-colour
                picker is gone: the palette has no accent to pick. */}
            <div style={{
              width: '24px', height: '24px',
              background: avatarUrl ? 'transparent' : 'var(--color-surface-2)',
              borderRadius: 'var(--radius-xs)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, cursor: 'pointer', overflow: 'hidden',
              border: `1px solid ${showDropdown ? 'var(--color-line-3)' : 'var(--color-line-1)'}`,
              transition: 'border-color 0.12s',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Num size="xs" tone="neutral">{avatarLetter}</Num>
              }
            </div>
            <div className="hidden sm:flex flex-col" style={{ lineHeight: 1.25 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-1)' }}>
                {profile.display_name}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-ink-3)' }}>
                {profile.timezone.split('/')[1]?.replace('_', ' ')} · {profile.currency}
              </span>
            </div>
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 7px)', right: 0,
              width: '272px', zIndex: 50,
              background: '#0F0F0F',
              border: '1px solid var(--color-line-2)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              {/* Display name */}
              <div>
                <Label style={{ display: 'block', marginBottom: '5px' }}>Display name</Label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--color-line-1)')}
                />
              </div>

              {/* Profile photo */}
              <div>
                <Label style={{ display: 'block', marginBottom: '8px' }}>Profile photo</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{
                      width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                      background: avatarUrl ? 'transparent' : 'var(--color-surface-2)',
                      border: '1px solid var(--color-line-1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', cursor: uploading ? 'default' : 'pointer',
                      position: 'relative', transition: 'opacity 0.15s',
                      opacity: uploading ? 0.6 : 1,
                    }}
                  >
                    {avatarUrl
                      ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Num size="lg" tone="neutral">{avatarLetter}</Num>
                    }
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{ ...ghostButton, opacity: uploading ? 0.6 : 1 }}
                    >
                      {uploading ? 'Uploading…' : 'Upload photo'}
                    </button>
                    {avatarUrl && (
                      <button
                        onClick={handleRemovePhoto}
                        disabled={uploading}
                        style={{
                          ...ghostButton,
                          background: 'transparent',
                          borderColor: 'var(--color-down-dim)',
                          color: 'var(--color-down)',
                        }}
                      >
                        Remove
                      </button>
                    )}
                    <Label>Max 2 MB · JPG or PNG</Label>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              </div>

              {/* Timezone */}
              <div>
                <Label style={{ display: 'block', marginBottom: '5px' }}>Timezone</Label>
                <Select
                  ariaLabel="Timezone"
                  value={editTz}
                  onChange={setEditTz}
                  options={TIMEZONES.map(tz => ({ key: tz, label: tz }))}
                />
              </div>

              {/* Currency */}
              <div>
                <Label style={{ display: 'block', marginBottom: '5px' }}>Currency</Label>
                <Segmented
                  options={CURRENCIES.map(c => ({ key: c, label: c }))}
                  value={editCurrency as typeof CURRENCIES[number]}
                  onChange={setEditCurrency}
                />
              </div>

              {/* Save */}
              <button
                onClick={handleSaveProfile}
                style={{
                  width: '100%', padding: '8px',
                  background: 'var(--color-ink-1)', border: 'none', borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-void)', fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)', cursor: 'pointer',
                  transition: 'opacity 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Save
              </button>

              <div style={{ height: '1px', background: 'var(--color-line-1)' }} />
              <button
                onClick={handleLogout}
                style={{
                  ...ghostButton,
                  width: '100%', background: 'transparent',
                  borderColor: 'var(--color-down-dim)', color: 'var(--color-down)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-down-dim)' }}
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
          onConnected={() => setTimeout(() => runSync(), 5000)}
          isConnected={status.connected}
        />
      )}
    </>
  )
}
