'use client'

import { useEffect, useRef, useState } from 'react'
import {
  IconLayoutDashboard, IconChartCandle, IconBriefcase, IconNotebook,
  IconWorld, IconTargetArrow, IconChecklist, IconArrowsRightLeft,
  IconSparkles, IconSettings,
} from '@tabler/icons-react'

const TABS: { id: number; label: string; icon: React.ComponentType<{ size?: number; stroke?: number }>; isGold?: boolean }[] = [
  { id: 0, label: 'Overview',    icon: IconLayoutDashboard },
  { id: 1, label: 'Trading',     icon: IconChartCandle     },
  { id: 2, label: 'Portfolio',   icon: IconBriefcase       },
  { id: 3, label: 'Journal',     icon: IconNotebook        },
  { id: 4, label: 'Macro',       icon: IconWorld           },
  { id: 5, label: 'Discipline',  icon: IconTargetArrow     },
  { id: 7, label: 'Tasks',       icon: IconChecklist       },
  { id: 8, label: 'Copy',        icon: IconArrowsRightLeft },
  { id: 6, label: 'Analyst', icon: IconSparkles, isGold: true },
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

  const activeIsGold = TABS.find(t => t.id === activeTab)?.isGold

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        background:    'var(--s1)',
        borderBottom:  '1px solid var(--bd)',
        paddingLeft:   '16px',
        paddingRight:  '8px',
        height:        '42px',
        gap:           '2px',
      }}
    >
      <div
        ref={trackRef}
        className="flex items-center flex-1 overflow-x-auto gap-0.5"
        style={{ height: '100%', position: 'relative', msOverflowStyle: 'none', scrollbarWidth: 'none' } as React.CSSProperties}
      >
        {TABS.map((tab) => {
          const isActive = !showSettings && activeTab === tab.id
          const isGold   = tab.isGold
          const Icon     = tab.icon

          return (
            <button
              key={tab.id}
              ref={el => { if (el) btnRefs.current.set(tab.id, el) }}
              onClick={() => onTabChange(tab.id)}
              title={`${tab.label} — press ${TABS.findIndex(t => t.id === tab.id) + 1}`}
              style={{
                height:       '100%',
                padding:      '0 13px',
                fontSize:     '12px',
                fontWeight:   isActive ? 600 : 400,
                display:      'flex',
                alignItems:   'center',
                gap:          '6px',
                color:        isActive
                  ? (isGold ? 'var(--go2)' : 'var(--t1)')
                  : (isGold ? 'var(--go2)' : '#727272'),
                background:   'transparent',
                border:       'none',
                borderRadius: '0',
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                transition:   'color 0.14s, background 0.14s',
                flexShrink:   0,
                letterSpacing: isActive ? '-0.01em' : '0',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = isGold ? 'var(--go2)' : 'var(--t1)'
                  e.currentTarget.style.background = 'var(--s2)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = isGold ? 'var(--go2)' : '#727272'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <Icon size={14} stroke={1.7} />
              {tab.label}
            </button>
          )
        })}

        {/* Sliding active indicator */}
        {indicator && (
          <div style={{
            position: 'absolute', bottom: 0, height: '2px',
            left: indicator.left, width: indicator.width,
            background: activeIsGold ? 'var(--go2)' : 'var(--ac)',
            borderRadius: '2px 2px 0 0',
            boxShadow: `0 0 8px ${activeIsGold ? 'var(--go2)' : 'var(--ac)'}66`,
            transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1), width 0.22s cubic-bezier(0.4, 0, 0.2, 1), background 0.22s',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      <button
        onClick={onSettingsToggle}
        title="Settings"
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{
          width: '28px', height: '28px', marginLeft: '4px',
          background: showSettings ? 'var(--s3)' : 'transparent',
          border: 'none',
          color: showSettings ? 'var(--ac)' : '#727272',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => {
          if (!showSettings) {
            e.currentTarget.style.background = 'var(--s2)'
            e.currentTarget.style.color = 'var(--t1)'
          }
        }}
        onMouseLeave={(e) => {
          if (!showSettings) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#727272'
          }
        }}
      >
        <IconSettings size={14} stroke={1.8} />
      </button>
    </div>
  )
}
