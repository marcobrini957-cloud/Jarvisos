import type { IconName } from '@/components/ui/Icon'

/**
 * The dashboard's sections, in the order they are offered.
 *
 * This used to be duplicated in TabBar and MobileNav, which is how the mobile
 * drawer ended up listing a different order from the desktop bar. One list now
 * feeds the desktop bar, the mobile menu, and the section name in the top bar.
 */
export interface TabDef {
  id:    number
  label: string
  icon:  IconName
  /** One line explaining the section — shown in the mobile menu. */
  hint:  string
}

export const TABS: TabDef[] = [
  { id: 0, label: 'Home',       icon: 'home',        hint: 'Today, net worth and your edge' },
  { id: 1, label: 'Trading',    icon: 'chart',       hint: 'Charts, trade log and performance' },
  { id: 2, label: 'Portfolio',  icon: 'briefcase',   hint: 'Holdings and allocation' },
  { id: 3, label: 'Journal',    icon: 'journal',     hint: 'Daily entries and weekly review' },
  { id: 4, label: 'News',       icon: 'globe',       hint: 'Economic calendar and releases' },
  { id: 5, label: 'Discipline', icon: 'target',      hint: 'Habits, streaks and Trader DNA' },
  { id: 7, label: 'Tasks',      icon: 'checkSquare', hint: 'What you planned to do' },
  { id: 8, label: 'Copy',       icon: 'swap',        hint: 'Mirror trades across accounts' },
  { id: 9, label: 'Partners',   icon: 'gift',        hint: 'Tools and offers' },
  { id: 6, label: 'Analyst',    icon: 'spark',       hint: 'Ask VELQUOR about your data' },
]

export const SETTINGS_TAB = -2

export function tabLabel(id: number, showSettings: boolean): string {
  if (showSettings) return 'Settings'
  return TABS.find(t => t.id === id)?.label ?? 'Home'
}

/**
 * The section you are in belongs in the URL.
 *
 * The shell held the active tab in useState(0), so a refresh — or a link
 * someone sent you — always dropped you back on Home no matter which section
 * you were reading. The slug lives in ?tab= so the server can render the right
 * section on the first paint (no flash of Home) and reloading keeps you where
 * you were. The shell writes it with replaceState, so switching sections does
 * not stack history entries — Back leaves the dashboard, it does not walk back
 * through the tabs you visited.
 */
export const TAB_QUERY_KEY = 'tab'

export function tabSlug(id: number): string | null {
  if (id === SETTINGS_TAB) return 'settings'
  const label = TABS.find(t => t.id === id)?.label
  return label ? label.toLowerCase() : null
}

/** Slug → tab id. Unknown or missing slugs fall back to Home. */
export function tabFromSlug(slug: string | null | undefined): { id: number; settings: boolean } {
  const s = (slug ?? '').trim().toLowerCase()
  if (!s) return { id: 0, settings: false }
  if (s === 'settings') return { id: 0, settings: true }
  const hit = TABS.find(t => t.label.toLowerCase() === s)
  return { id: hit?.id ?? 0, settings: false }
}
