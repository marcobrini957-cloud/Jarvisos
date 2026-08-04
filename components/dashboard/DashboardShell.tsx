'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Topbar from './Topbar'
import { UserProfileProvider } from '@/context/UserProfileContext'
import { Sidebar } from './Sidebar'
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
import PartnersTab     from './tabs/PartnersTab'
import SettingsTab     from './tabs/SettingsTab'
import WelcomeGreeting from './WelcomeGreeting'
import PartnerRail     from './PartnerRail'
import FeedbackButton  from './FeedbackButton'
import TourHost        from './tour/TourHost'
import { DashboardAtmosphere } from './DashboardAtmosphere'
import { tabLabel, tabSlug, tabFromSlug, TAB_QUERY_KEY } from './tabs'

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
  9: PartnersTab,
}

export default function DashboardShell({ initialTab = 0, initialSettings = false }: {
  initialTab?: number
  initialSettings?: boolean
}) {
  const [activeTab,    setActiveTab]    = useState(initialTab)
  const [showSettings, setShowSettings] = useState(initialSettings)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  // Keep ?tab= in step with the section on screen, so a refresh lands you back
  // here instead of on Home. replaceState rather than push: switching sections
  // is not navigation, and stacking history entries would make Back feel broken.
  // The server has already read this param for the first paint (app/dashboard).
  useEffect(() => {
    const slug = showSettings ? 'settings' : tabSlug(activeTab)
    if (!slug) return
    const url = new URL(window.location.href)
    if (url.searchParams.get(TAB_QUERY_KEY) === slug) return
    url.searchParams.set(TAB_QUERY_KEY, slug)
    window.history.replaceState(null, '', url)
  }, [activeTab, showSettings])

  // Back/forward between sections: the URL is the source of truth, so follow it.
  useEffect(() => {
    const onPop = () => {
      const slug = new URL(window.location.href).searchParams.get(TAB_QUERY_KEY)
      const { id, settings } = tabFromSlug(slug)
      setActiveTab(id)
      setShowSettings(settings)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // The 2.0 language is scoped to `.vq2` (see globals.css). It sits on the
  // shell below, and on <body> as well so InfoTip's portal — which renders
  // outside this tree — inherits the same tokens.
  useEffect(() => {
    document.body.classList.add('vq2')
    return () => document.body.classList.remove('vq2')
  }, [])

  // Settle a beta invite the browser may have arrived on. The auth callback
  // already tries this, but a password sign-in never passes through it and
  // Google login is a client transition — so a tester would otherwise sit on
  // the free tier with every paid panel locked. Idempotent server-side, and
  // once per tab is enough.
  useEffect(() => {
    if (sessionStorage.getItem('vq-beta-claimed')) return
    fetch('/api/beta/claim', { method: 'POST' })
      .then(r => r.ok && sessionStorage.setItem('vq-beta-claimed', '1'))
      .catch(() => {})
  }, [])

  // Ping last_seen_at so dev console can show "Online Now"
  useEffect(() => {
    fetch('/api/dev/ping', { method: 'POST' }).catch(() => {})
    const iv = setInterval(() => { fetch('/api/dev/ping', { method: 'POST' }).catch(() => {}) }, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  // Keyboard tab switching: 1–9 jump to tabs in bar order (skipped while typing)
  useEffect(() => {
    const TAB_ORDER = [0, 1, 2, 3, 4, 5, 7, 8, 9, 6] // matches TabBar layout
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

  // Programmatic tab switching (e.g. topbar account menu → Copy tab)
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const tab = (e as CustomEvent<number>).detail
      if (typeof tab === 'number' && TAB_COMPONENTS[tab]) {
        setActiveTab(tab)
        setShowSettings(false)
      }
    }
    window.addEventListener('vq-switch-tab', onSwitch)
    return () => window.removeEventListener('vq-switch-tab', onSwitch)
  }, [])

  const ActiveTab = TAB_COMPONENTS[activeTab] ?? TAB_COMPONENTS[0]

  // Landing mid-page in a section you just navigated to reads as a glitch, so
  // each change starts at the top of the new section. The dashboard scrolls in
  // this inner <main>, not the window.
  const handleTabChange = useCallback((id: number) => {
    setActiveTab(id)
    setShowSettings(false)
    mainRef.current?.scrollTo({ top: 0 })
  }, [])

  const handleSettingsToggle = useCallback(() => {
    setShowSettings(v => !v)
    mainRef.current?.scrollTo({ top: 0 })
  }, [])

  return (
    <UserProfileProvider>
      <WelcomeGreeting />
      {/* Outside the tab wrapper on purpose — see FeedbackButton's header. */}
      <FeedbackButton activeTab={activeTab} showSettings={showSettings} />
      <TourHost />
      {/* Exactly one viewport tall, and it owns its own scrolling — the page
          behind it no longer needs to be locked. */}
      <div className="vq2" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
        {/* The landing's lit render, behind everything. Panels are translucent
            sheets over it — which is what makes the whole screen read as one
            object instead of boxes on a void. */}
        <DashboardAtmosphere />

        {/* Navigation is a column now, with the header above the content it
            describes rather than above the whole window. */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Sidebar
            activeTab={activeTab}
            showSettings={showSettings}
            onTabChange={handleTabChange}
            onSettingsToggle={handleSettingsToggle}
          />

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
            <Topbar
              menuOpen={menuOpen}
              onMenuToggle={() => setMenuOpen(v => !v)}
              sectionLabel={tabLabel(activeTab, showSettings)}
            />

            <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <main
                ref={mainRef}
                className="flex-1 overflow-y-auto overflow-x-hidden dashboard-main"
                style={{ padding: 'clamp(14px, 1.3vw, 22px)' }}
              >
                {/* keyed wrapper re-mounts on tab change → vq-tab-in entrance plays */}
                <div key={showSettings ? 'settings' : activeTab} className="vq-tab-in">
                  {showSettings ? <SettingsTab /> : <ActiveTab />}
                </div>
              </main>

              {/* Free-tier affiliate rail — hidden on the Partners tab (redundant) */}
              {!showSettings && activeTab !== 9 && (
                <PartnerRail className="hidden xl:flex xl:flex-col" />
              )}
            </div>
          </div>
        </div>

        {/* Mobile navigation — a sheet from the top bar, not a bottom bar */}
        <div className="block sm:hidden">
          <MobileNav
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            showSettings={showSettings}
            onSettingsToggle={handleSettingsToggle}
          />
        </div>
      </div>
    </UserProfileProvider>
  )
}
