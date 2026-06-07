'use client'

import { useState, useEffect } from 'react'
import Topbar from './Topbar'
import TabBar from './TabBar'
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

  // Apply saved theme on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('jarvis-theme') ?? '{}')
      if (saved.accent) document.documentElement.style.setProperty('--ac', saved.accent)
      if (saved.bgTheme) {
        const themes: Record<string, Record<string, string>> = {
          Default:  { '--bg': '#0D1117', '--s1': '#161B22', '--s2': '#1C2230', '--s3': '#21293A' },
          Midnight: { '--bg': '#080B10', '--s1': '#0F1419', '--s2': '#151D28', '--s3': '#1A2535' },
          Soft:     { '--bg': '#11161E', '--s1': '#191F28', '--s2': '#1F2738', '--s3': '#252E40' },
        }
        const vars = themes[saved.bgTheme]
        if (vars) Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
      }
    } catch { /* ignore */ }
  }, [])

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: 'var(--bg)' }}>
      <Topbar />
      <TabBar
        activeTab={activeTab}
        onTabChange={(id) => { setActiveTab(id); setShowSettings(false) }}
        showSettings={showSettings}
        onSettingsToggle={() => setShowSettings(v => !v)}
      />
      <main className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
        {showSettings ? <SettingsTab /> : <ActiveTab />}
      </main>
    </div>
  )
}
