'use client'

import { useState } from 'react'

// Primary tabs shown in the bottom bar (5 max)
const PRIMARY_TABS = [
  { id: 0, label: 'Home',       icon: '⌂'  },
  { id: 1, label: 'Trading',    icon: '📈' },
  { id: 6, label: 'Ask VELQUOR', icon: '✦', isGold: true },
  { id: 3, label: 'Journal',    icon: '✍' },
  { id: -1, label: 'More',      icon: '⋯'  },
]

// All tabs for the "More" drawer
const ALL_TABS = [
  { id: 0, label: 'Overview',   icon: '⌂'  },
  { id: 1, label: 'Trading',    icon: '📈' },
  { id: 2, label: 'Portfolio',  icon: '💼' },
  { id: 3, label: 'Journal',    icon: '✍' },
  { id: 4, label: 'Macro',      icon: '🌐' },
  { id: 5, label: 'Discipline', icon: '🎯' },
  { id: 7, label: 'Tasks',       icon: '✅' },
  { id: 6, label: 'Ask VELQUOR', icon: '✦', isGold: true },
]

interface Props {
  activeTab:        number
  onTabChange:      (id: number) => void
  showSettings:     boolean
  onSettingsToggle: () => void
}

export default function MobileNav({ activeTab, onTabChange, showSettings, onSettingsToggle }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  function selectTab(id: number) {
    onTabChange(id)
    setDrawerOpen(false)
  }

  function handlePrimaryClick(tabId: number) {
    if (tabId === -1) {
      setDrawerOpen(v => !v)
    } else {
      selectTab(tabId)
    }
  }

  return (
    <>
      {/* Overlay when drawer is open */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* More drawer — slides up from above the nav bar */}
      <div className={drawerOpen ? 'mobile-drawer' : ''} style={{
        position: 'fixed',
        left: 0, right: 0,
        bottom: drawerOpen ? '65px' : '-400px',
        zIndex: 50,
        transition: 'bottom 0.3s cubic-bezier(0.16,1,0.3,1)',
        background: 'var(--s1)',
        border: '1px solid var(--bd2)',
        borderBottom: 'none',
        borderRadius: '20px 20px 0 0',
        padding: '12px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Drag handle */}
        <div style={{
          width: '36px', height: '4px', borderRadius: '2px',
          background: 'var(--bd2)', margin: '0 auto 12px',
        }} />

        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px 12px',
          borderBottom: '1px solid var(--bd)',
        }}>
          <span style={{ color: 'var(--t3)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            All sections
          </span>
          <button
            onClick={() => { onSettingsToggle(); setDrawerOpen(false) }}
            style={{
              background: showSettings ? 'var(--s3)' : 'transparent',
              border: '1px solid var(--bd2)', borderRadius: '8px',
              padding: '5px 10px', color: showSettings ? 'var(--ac)' : 'var(--t2)',
              fontSize: '12px', cursor: 'pointer',
            }}
          >
            ⚙ Settings
          </button>
        </div>

        {/* Tab grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2px', padding: '8px',
        }}>
          {ALL_TABS.map(tab => {
            const isActive = !showSettings && activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '14px 8px',
                  borderRadius: '12px',
                  background: isActive ? 'var(--s3)' : 'transparent',
                  border: isActive ? '1px solid var(--bd2)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{tab.icon}</span>
                <span style={{
                  fontSize: '11px', fontWeight: isActive ? 600 : 400,
                  color: isActive
                    ? (tab.isGold ? 'var(--go2)' : 'var(--t1)')
                    : (tab.isGold ? 'var(--go)' : 'var(--t2)'),
                }}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Safe area padding */}
        <div style={{ height: '8px' }} />
      </div>

      {/* Bottom nav bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--s1)',
        borderTop: '1px solid var(--bd2)',
        display: 'flex', alignItems: 'stretch',
        height: '65px',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.03)',
      }}>
        {PRIMARY_TABS.map(tab => {
          const isMore   = tab.id === -1
          const isActive = isMore
            ? drawerOpen
            : (!showSettings && activeTab === tab.id)

          return (
            <button
              key={tab.id}
              onClick={() => handlePrimaryClick(tab.id)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '4px', paddingBottom: '2px',
                background: 'transparent', border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.12s',
                opacity: isActive ? 1 : 0.6,
              position: 'relative',
              }}
            >
              <span style={{
                fontSize: '20px', lineHeight: 1,
                filter: isActive && tab.isGold ? 'drop-shadow(0 0 6px rgba(212,160,52,0.6))' : 'none',
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: isActive ? 600 : 400,
                color: isActive
                  ? (tab.isGold ? 'var(--go2)' : 'var(--ac)')
                  : 'var(--t3)',
                letterSpacing: '0.01em',
              }}>
                {tab.label}
              </span>
              {/* Active indicator bar at top */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '20%', right: '20%',
                  height: '2px', borderRadius: '0 0 2px 2px',
                  background: tab.isGold ? 'var(--go2)' : 'var(--ac)',
                }} />
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
