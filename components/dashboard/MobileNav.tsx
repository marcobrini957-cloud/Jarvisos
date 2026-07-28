'use client'

import { useState } from 'react'
import Icon, { type IconName } from '@/components/ui/Icon'
import { Label } from '@/components/ui/vq'

// Primary tabs shown in the bottom bar (5 max)
const PRIMARY_TABS: { id: number; label: string; icon: IconName }[] = [
  { id: 0,  label: 'Home',    icon: 'home'    },
  { id: 1,  label: 'Trading', icon: 'chart'   },
  { id: 6,  label: 'Analyst', icon: 'spark'   },
  { id: 3,  label: 'Journal', icon: 'journal' },
  { id: -1, label: 'More',    icon: 'more'    },
]

// All tabs for the "More" drawer
const ALL_TABS: { id: number; label: string; icon: IconName }[] = [
  { id: 0, label: 'Home',       icon: 'home'        },
  { id: 1, label: 'Trading',    icon: 'chart'       },
  { id: 2, label: 'Portfolio',  icon: 'briefcase'   },
  { id: 3, label: 'Journal',    icon: 'journal'     },
  { id: 4, label: 'News',       icon: 'globe'       },
  { id: 5, label: 'Discipline', icon: 'target'      },
  { id: 7, label: 'Tasks',      icon: 'checkSquare' },
  { id: 8, label: 'Copy',       icon: 'swap'        },
  { id: 9, label: 'Partners',   icon: 'gift'        },
  { id: 6, label: 'Analyst',    icon: 'spark'       },
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
            background: 'rgba(0,0,0,0.72)',
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
        background: '#0A0A0A',
        borderTop: '1px solid var(--color-line-2)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        padding: '10px 0 0',
      }}>
        {/* Drag handle */}
        <div style={{
          width: '30px', height: '2px',
          background: 'var(--color-line-3)', margin: '0 auto 10px',
        }} />

        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px 10px',
          borderBottom: '1px solid var(--color-line-1)',
        }}>
          <Label>All sections</Label>
          <button
            onClick={() => { onSettingsToggle(); setDrawerOpen(false) }}
            style={{
              background: showSettings ? 'var(--color-surface-2)' : 'transparent',
              border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-sm)',
              padding: '5px 9px', color: showSettings ? 'var(--color-ink-1)' : 'var(--color-ink-2)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
              <Icon name="settings" size={14} /> Settings
            </span>
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
                  gap: '6px', padding: '13px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--color-surface-2)' : 'transparent',
                  border: '1px solid transparent',
                  color: isActive ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                <Icon name={tab.icon} size={19} />
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: isActive ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
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
        background: 'var(--color-void)',
        borderTop: '1px solid var(--color-line-1)',
        display: 'flex', alignItems: 'stretch',
        height: '65px',
        paddingBottom: 'env(safe-area-inset-bottom)',
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
                transition: 'color 0.12s',
                color: isActive ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                position: 'relative',
              }}
            >
              <Icon name={tab.icon} size={16} />
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'inherit',
              }}>
                {tab.label}
              </span>
              {/* Active indicator — one hairline at the top edge */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: '22%', right: '22%',
                  height: '1px', background: 'var(--color-ink-1)',
                }} />
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
