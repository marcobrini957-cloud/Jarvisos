'use client'

import {
  IconLayoutDashboard,
  IconChartCandle,
  IconBuildingBank,
  IconNotebook,
  IconWorld,
  IconCheckbox,
  IconFlame,
  IconClipboardList,
  IconRobot,
  IconSettings,
} from '@tabler/icons-react'

const NAV_ITEMS = [
  { id: 0, icon: IconLayoutDashboard, label: 'Overview'       },
  { id: 1, icon: IconChartCandle,     label: 'Trading'        },
  { id: 2, icon: IconBuildingBank,    label: 'Portfolio'      },
  { id: 3, icon: IconNotebook,        label: 'Journal'        },
  null,
  { id: 4, icon: IconWorld,           label: 'Macro'          },
  { id: 5, icon: IconCheckbox,        label: 'Tasks'          },
  { id: 6, icon: IconFlame,           label: 'Habits'         },
  { id: 7, icon: IconClipboardList,   label: 'Weekly Review'  },
] as const

interface SidebarProps {
  activeTab:        number
  onTabChange:      (id: number) => void
  showSettings:     boolean
  onSettingsToggle: () => void
}

function IconBtn({
  icon: Icon,
  label,
  isActive,
  isGold,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number }>
  label: string
  isActive: boolean
  isGold?: boolean
  onClick: () => void
}) {
  const activeColor  = isGold ? 'var(--go2)' : 'var(--ac)'
  const defaultColor = isGold ? 'var(--go2)' : '#727272'

  return (
    <button
      onClick={onClick}
      title={label}
      className="relative flex items-center justify-center rounded-lg transition-all"
      style={{
        width: '36px', height: '36px',
        background: isActive
          ? (isGold ? 'rgba(212,160,52,0.12)' : 'rgba(79,142,247,0.12)')
          : 'transparent',
        border: 'none',
        color: isActive ? activeColor : defaultColor,
        cursor: 'pointer',
        transition: 'background 0.13s, color 0.13s',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--s3)'
          e.currentTarget.style.color = isGold ? 'var(--go2)' : 'var(--t1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = defaultColor
        }
      }}
    >
      {isActive && (
        <span
          className="absolute left-0"
          style={{
            width: '2px', height: '16px',
            background: isGold ? 'var(--go2)' : 'var(--ac)',
            borderRadius: '0 3px 3px 0',
            boxShadow: isGold ? '0 0 6px rgba(212,160,52,0.5)' : '0 0 6px rgba(79,142,247,0.5)',
          }}
        />
      )}
      <Icon size={17} stroke={isActive ? 2 : 1.5} />
    </button>
  )
}

export default function Sidebar({ activeTab, onTabChange, showSettings, onSettingsToggle }: SidebarProps) {
  return (
    <div
      className="flex flex-col items-center py-3 gap-1 flex-shrink-0"
      style={{
        width: '48px',
        background: 'var(--s1)',
        borderRight: '1px solid var(--bd)',
      }}
    >
      {NAV_ITEMS.map((item, i) => {
        if (item === null) {
          return (
            <div
              key={`divider-${i}`}
              className="my-1"
              style={{ width: '24px', height: '1px', background: 'var(--bd)' }}
            />
          )
        }
        return (
          <IconBtn
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={!showSettings && activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        )
      })}

      <div className="flex-1" />

      {/* VELQUOR AI (gold) */}
      <IconBtn
        icon={IconRobot}
        label="Analyst"
        isActive={!showSettings && activeTab === 8}
        isGold
        onClick={() => onTabChange(8)}
      />

      <div style={{ width: '24px', height: '1px', background: 'var(--bd)', margin: '4px 0' }} />

      {/* Settings */}
      <button
        title="Settings"
        onClick={onSettingsToggle}
        className="relative flex items-center justify-center rounded-md transition-all"
        style={{
          width: '36px', height: '36px',
          background: showSettings ? 'rgba(88,166,255,0.12)' : 'transparent',
          border: 'none',
          color: showSettings ? 'var(--ac)' : '#727272',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!showSettings) {
            e.currentTarget.style.background = 'var(--s3)'
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
        {showSettings && (
          <span
            className="absolute left-0"
            style={{ width: '2px', height: '18px', background: 'var(--ac)', borderRadius: '0 2px 2px 0' }}
          />
        )}
        <IconSettings size={18} stroke={1.5} />
      </button>
    </div>
  )
}
