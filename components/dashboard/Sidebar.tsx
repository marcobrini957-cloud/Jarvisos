'use client'

import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { LogoMark } from '@/components/ui/LogoMark'
import { TABS, SETTINGS_TAB } from './tabs'

/**
 * The dashboard's navigation, moved to the side.
 *
 * It was a horizontal bar of ten icon tabs above the content, which is a shape
 * that stops working the moment there are ten of them: the labels compete for a
 * single line, the bar scrolls sideways on a laptop, and the active indicator
 * has to be measured in JS to follow it. A column has room for the label at a
 * readable size, keeps every section visible at once, and gives the header back
 * to saying where you are.
 *
 * Primary sections on top, account-level ones at the foot — Settings sits with
 * Profile and Support rather than being an eleventh peer of Trading.
 *
 * The list comes from tabs.ts, which is also what the mobile sheet reads, so
 * the two can never disagree about the order again.
 */

const FOOT = [
  { id: SETTINGS_TAB, label: 'Settings', icon: 'settings' as const },
]

export function Sidebar({
  activeTab, showSettings, onTabChange, onSettingsToggle,
}: {
  activeTab: number
  showSettings: boolean
  onTabChange: (id: number) => void
  onSettingsToggle: () => void
}) {
  const item = (
    key: string,
    label: string,
    icon: Parameters<typeof Icon>[0]['name'],
    active: boolean,
    onClick: () => void,
    hint?: string,
  ) => (
    <button
      key={key}
      onClick={onClick}
      title={hint}
      className="vq-side-item"
      style={{
        display: 'flex', alignItems: 'center', gap: '11px', width: '100%',
        padding: '9px 11px', borderRadius: '10px', cursor: 'pointer',
        border: '1px solid transparent',
        background: active ? 'var(--color-surface-2)' : 'transparent',
        borderColor: active ? 'var(--color-line-1)' : 'transparent',
        color: active ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
        letterSpacing: '-0.01em', textAlign: 'left',
        transition: 'background 0.14s, color 0.14s',
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}><Icon name={icon} size={17} /></span>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </button>
  )

  return (
    <aside
      className="vq-sidebar"
      style={{
        width: '224px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--color-void)',
        borderRight: '1px solid var(--color-line-1)',
        padding: '14px 12px 12px',
        overflowY: 'auto',
      }}
    >
      {/* Wordmark. It moved off the header with the navigation. */}
      <Link
        href="/dashboard"
        style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          padding: '2px 6px 16px', textDecoration: 'none', minWidth: 0,
        }}
      >
        <LogoMark size={22} showBackground={false} />
        <span style={{
          fontFamily: 'var(--font-mark)', fontSize: 'var(--text-lg)', lineHeight: 1,
          letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-ink-1)',
        }}>
          Velquor
        </span>
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {TABS.map(t =>
          item(String(t.id), t.label, t.icon, !showSettings && activeTab === t.id, () => onTabChange(t.id), t.hint),
        )}
      </nav>

      {/* Account-level, pinned to the foot. */}
      <div style={{ marginTop: 'auto', paddingTop: '14px' }}>
        <div style={{ borderTop: '1px solid var(--color-line-1)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {FOOT.map(f => item(String(f.id), f.label, f.icon, showSettings, onSettingsToggle))}
        </div>
      </div>

      <style>{`
        .vq-side-item:hover { background: var(--color-state-hover); color: var(--color-ink-1); }
        /* The column is desktop-only — phones keep the sheet from the header.
           !important because the element carries an inline display:'flex', and
           an inline style beats a stylesheet rule regardless of media query. */
        @media (max-width: 900px) { .vq-sidebar { display: none !important; } }
      `}</style>
    </aside>
  )
}
