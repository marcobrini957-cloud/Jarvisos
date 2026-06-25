'use client'

import React, { useState } from 'react'
import Topbar from './Topbar'
import { UserProfileProvider } from '@/context/UserProfileContext'
import TabBar from './TabBar'
import MobileNav from './MobileNav'
import OverviewTab    from './tabs/OverviewTab'
import TradingTab     from './tabs/TradingTab'
import PortfolioTab   from './tabs/PortfolioTab'
import JournalTab     from './tabs/JournalTab'
import MacroTab       from './tabs/MacroTab'
import DisciplineTab  from './tabs/DisciplineTab'
import VelquorTab     from './tabs/VelquorTab'
import TasksTab       from './tabs/TasksTab'
import SettingsTab    from './tabs/SettingsTab'
import WelcomeGreeting from './WelcomeGreeting'

const TAB_COMPONENTS: Record<number, React.ComponentType> = {
  0: OverviewTab,
  1: TradingTab,
  2: PortfolioTab,
  3: JournalTab,
  4: MacroTab,
  5: DisciplineTab,
  6: VelquorTab,
  7: TasksTab,
}

export default function DashboardShell() {
  const [activeTab,    setActiveTab]    = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  const ActiveTab = TAB_COMPONENTS[activeTab] ?? TAB_COMPONENTS[0]

  function handleTabChange(id: number) {
    setActiveTab(id)
    setShowSettings(false)
  }

  return (
    <UserProfileProvider>
      <WelcomeGreeting />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', overflowX: 'hidden' }}>
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
          className="flex-1 overflow-y-auto overflow-x-hidden dashboard-main sm:pb-0 pb-24"
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
