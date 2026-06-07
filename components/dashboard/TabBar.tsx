'use client'

import { IconSettings } from '@tabler/icons-react'

const TABS: { id: number; label: string; isGold?: boolean }[] = [
  { id: 0, label: 'Overview'  },
  { id: 1, label: 'Trading'   },
  { id: 2, label: 'Portfolio' },
  { id: 3, label: 'Journal'   },
  { id: 4, label: 'Macro'     },
  { id: 5, label: 'Tasks'     },
  { id: 6, label: 'Habits'    },
  { id: 7, label: 'Review'    },
  { id: 8, label: 'Jarvis AI', isGold: true },
]

interface TabBarProps {
  activeTab:        number
  onTabChange:      (id: number) => void
  showSettings:     boolean
  onSettingsToggle: () => void
}

export default function TabBar({ activeTab, onTabChange, showSettings, onSettingsToggle }: TabBarProps) {
  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        background:    'var(--s1)',
        borderBottom:  '1px solid var(--bd)',
        paddingLeft:   '16px',
        paddingRight:  '8px',
        height:        '38px',
        gap:           '2px',
      }}
    >
      <div className="flex items-center flex-1 overflow-x-auto gap-0.5" style={{ height: '100%' }}>
        {TABS.map((tab) => {
          const isActive = !showSettings && activeTab === tab.id
          const isGold   = tab.isGold

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                height:       '100%',
                padding:      '0 13px',
                fontSize:     '12px',
                fontWeight:   isActive ? 600 : 400,
                color:        isActive
                  ? (isGold ? 'var(--go2)' : 'var(--t1)')
                  : (isGold ? 'var(--go)'  : 'var(--t3)'),
                background:   'transparent',
                border:       'none',
                borderBottom: isActive
                  ? `2px solid ${isGold ? 'var(--go2)' : 'var(--ac)'}`
                  : '2px solid transparent',
                borderRadius: '0',
                cursor:       'pointer',
                whiteSpace:   'nowrap',
                transition:   'all 0.14s',
                flexShrink:   0,
                letterSpacing: isActive ? '-0.01em' : '0',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = isGold ? 'var(--go2)' : 'var(--t2)'
                  e.currentTarget.style.background = 'var(--s2)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = isGold ? 'var(--go)' : 'var(--t3)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <button
        onClick={onSettingsToggle}
        title="Settings"
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{
          width: '28px', height: '28px', marginLeft: '4px',
          background: showSettings ? 'var(--s3)' : 'transparent',
          border: 'none',
          color: showSettings ? 'var(--ac)' : 'var(--t3)',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => {
          if (!showSettings) {
            e.currentTarget.style.background = 'var(--s2)'
            e.currentTarget.style.color = 'var(--t2)'
          }
        }}
        onMouseLeave={(e) => {
          if (!showSettings) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--t3)'
          }
        }}
      >
        <IconSettings size={14} stroke={1.8} />
      </button>
    </div>
  )
}
