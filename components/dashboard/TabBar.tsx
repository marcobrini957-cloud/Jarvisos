'use client'

import { useEffect, useRef, useState } from 'react'
import {
  IconLayoutDashboard, IconChartCandle, IconBriefcase, IconNotebook,
  IconWorld, IconTargetArrow, IconChecklist, IconArrowsRightLeft,
  IconSparkles, IconSettings, IconGift,
} from '@tabler/icons-react'

// Analyst used to be gold in both states — the one tab that shouted. In 2.0 it
// is a tab like any other; what it does is interesting, its colour is not.
const TABS: { id: number; label: string; icon: React.ComponentType<{ size?: number; stroke?: number }> }[] = [
  { id: 0, label: 'Overview',   icon: IconLayoutDashboard },
  { id: 1, label: 'Trading',    icon: IconChartCandle     },
  { id: 2, label: 'Portfolio',  icon: IconBriefcase       },
  { id: 3, label: 'Journal',    icon: IconNotebook        },
  { id: 4, label: 'News',       icon: IconWorld           },
  { id: 5, label: 'Discipline', icon: IconTargetArrow     },
  { id: 7, label: 'Tasks',      icon: IconChecklist       },
  { id: 8, label: 'Copy',       icon: IconArrowsRightLeft },
  { id: 9, label: 'Partners',   icon: IconGift            },
  { id: 6, label: 'Analyst',    icon: IconSparkles        },
]

interface TabBarProps {
  activeTab:        number
  onTabChange:      (id: number) => void
  showSettings:     boolean
  onSettingsToggle: () => void
}

export default function TabBar({ activeTab, onTabChange, showSettings, onSettingsToggle }: TabBarProps) {
  const btnRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const trackRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  // Slide the active indicator under the current tab (measured, so it follows
  // label widths exactly and animates between positions).
  useEffect(() => {
    if (showSettings) { setIndicator(null); return }
    const btn = btnRefs.current.get(activeTab)
    const track = trackRef.current
    if (!btn || !track) return
    const measure = () => {
      const b = btn.getBoundingClientRect()
      const t = track.getBoundingClientRect()
      setIndicator({ left: b.left - t.left + track.scrollLeft, width: b.width })
    }
    measure()
    // keep the active tab visible when the bar scrolls horizontally
    btn.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeTab, showSettings])

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        background:    'var(--color-void)',
        borderBottom:  '1px solid var(--color-line-1)',
        paddingLeft:   '10px',
        paddingRight:  '8px',
        height:        '34px',
        gap:           '2px',
      }}
    >
      <div
        ref={trackRef}
        className="flex items-center flex-1 overflow-x-auto"
        style={{ height: '100%', position: 'relative', msOverflowStyle: 'none', scrollbarWidth: 'none' } as React.CSSProperties}
      >
        {TABS.map((tab) => {
          const isActive = !showSettings && activeTab === tab.id
          const Icon     = tab.icon

          return (
            <button
              key={tab.id}
              ref={el => { if (el) btnRefs.current.set(tab.id, el) }}
              onClick={() => onTabChange(tab.id)}
              title={`${tab.label} — press ${TABS.findIndex(t => t.id === tab.id) + 1}`}
              style={{
                height:        '100%',
                padding:       '0 11px',
                fontFamily:    'var(--font-display)',
                fontSize:      'var(--text-xs)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                display:       'flex',
                alignItems:    'center',
                gap:           '6px',
                color:         isActive ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                background:    'transparent',
                border:        'none',
                cursor:        'pointer',
                whiteSpace:    'nowrap',
                transition:    'color 0.14s, background 0.14s',
                flexShrink:    0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-ink-1)'
                  e.currentTarget.style.background = 'var(--color-state-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-ink-3)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <Icon size={13} stroke={1.6} />
              {tab.label}
            </button>
          )
        })}

        {/* Sliding active indicator — one hairline, no glow */}
        {indicator && (
          <div style={{
            position: 'absolute', bottom: 0, height: '1px',
            left: indicator.left, width: indicator.width,
            background: 'var(--color-ink-1)',
            transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1), width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      <button
        onClick={onSettingsToggle}
        title="Settings"
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '24px', height: '24px', marginLeft: '4px',
          borderRadius: 'var(--radius-xs)',
          background: showSettings ? 'var(--color-surface-2)' : 'transparent',
          border: 'none',
          color: showSettings ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => {
          if (!showSettings) {
            e.currentTarget.style.background = 'var(--color-state-hover)'
            e.currentTarget.style.color = 'var(--color-ink-1)'
          }
        }}
        onMouseLeave={(e) => {
          if (!showSettings) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-ink-3)'
          }
        }}
      >
        <IconSettings size={13} stroke={1.7} />
      </button>
    </div>
  )
}
