'use client'

import React, { useState, useEffect } from 'react'
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
import TasksTab        from './tabs/TasksTab'
import CopyTradingTab  from './tabs/CopyTradingTab'
import SettingsTab     from './tabs/SettingsTab'
import WelcomeGreeting from './WelcomeGreeting'
import { TickerTape } from '@/components/widgets/TradingViewWidget'

const TAB_COMPONENTS: Record<number, React.ComponentType> = {
  0: OverviewTab,
  1: TradingTab,
  2: PortfolioTab,
  3: JournalTab,
  4: MacroTab,
  5: DisciplineTab,
  6: VelquorTab,
  7: TasksTab,
  8: CopyTradingTab,
}

export default function DashboardShell() {
  const [activeTab,    setActiveTab]    = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  // Ping last_seen_at so dev console can show "Online Now"
  useEffect(() => {
    fetch('/api/dev/ping', { method: 'POST' }).catch(() => {})
    const iv = setInterval(() => { fetch('/api/dev/ping', { method: 'POST' }).catch(() => {}) }, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  // Keyboard tab switching: 1–9 jump to tabs in bar order (skipped while typing)
  useEffect(() => {
    const TAB_ORDER = [0, 1, 2, 3, 4, 5, 7, 8, 6] // matches TabBar layout
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      const n = Number(e.key)
      if (n >= 1 && n <= TAB_ORDER.length) {
        setActiveTab(TAB_ORDER[n - 1])
        setShowSettings(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

        {/* Live market ticker — official TradingView embed, desktop only */}
        <div className="hidden sm:block">
          <TickerTape />
        </div>

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
          {/* keyed wrapper re-mounts on tab change → vq-tab-in entrance plays */}
          <div key={showSettings ? 'settings' : activeTab} className="vq-tab-in">
            {showSettings ? <SettingsTab /> : <ActiveTab />}
          </div>
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
