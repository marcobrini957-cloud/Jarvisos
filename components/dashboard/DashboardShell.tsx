'use client'

import { useState } from 'react'
import Topbar from './Topbar'
import { UserProfileProvider } from '@/context/UserProfileContext'
import TabBar from './TabBar'
import MobileNav from './MobileNav'
import OverviewTab      from './tabs/OverviewTab'
import TradingTab       from './tabs/TradingTab'
import PortfolioTab     from './tabs/PortfolioTab'
import JournalTab       from './tabs/JournalTab'
import MacroTab         from './tabs/MacroTab'
import TasksTab         from './tabs/TasksTab'
import HabitsTab        from './tabs/HabitsTab'
import WeeklyReviewTab  from './tabs/WeeklyReviewTab'
import JarvisTab        from './tabs/JarvisTab'
import SettingsTab      from './tabs/SettingsTab'

const TAB_COMPONENTS = [
  OverviewTab,
  TradingTab,
  PortfolioTab,
  JournalTab,
  MacroTab,
  TasksTab,
  HabitsTab,
  WeeklyReviewTab,
  JarvisTab,
]

export default function DashboardShell() {
  const [activeTab,    setActiveTab]    = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  const ActiveTab = TAB_COMPONENTS[activeTab]

  function handleTabChange(id: number) {
    setActiveTab(id)
    setShowSettings(false)
  }

  return (
    <UserProfileProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
        <Topbar />

        {/* Desktop tab bar — hidden on mobile */}
        <div className="hidden sm:block">
          <TabBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            showSettings={showSettings}
            onSettingsToggle={() => setShowSettings(v => !v)}
          />
        </div>

        {/* Main content — padded bottom on mobile for the nav bar */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: 'clamp(16px, 2vw, 28px)' }}
        >
          {showSettings ? <SettingsTab /> : <ActiveTab />}
        </main>

        {/* Mobile bottom nav — hidden on desktop */}
        <div className="block sm:hidden">
          <MobileNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            showSettings={showSettings}
            onSettingsToggle={() => setShowSettings(v => !v)}
          />
        </div>
      </div>
    </UserProfileProvider>
  )
}
