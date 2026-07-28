import { isIconName, type IconName } from '@/components/ui/Icon'

/**
 * Habits persist their icon as a string in `habits.icon`. Before the 2.0
 * redesign that string was an emoji, so existing rows still hold one — the
 * column is written by users, not by a migration we can run once and forget.
 *
 * New habits store an IconName. Old rows are mapped on read, so nothing has to
 * be rewritten in the database and a user's habit keeps the mark they chose.
 */

/** The picker's set — habit-shaped icons only, not the whole library. */
export const HABIT_ICONS: IconName[] = [
  'check', 'journal', 'habit', 'chart', 'trendUp', 'target',
  'clock', 'calendar', 'shield', 'spark', 'doc', 'bolt',
]

export const DEFAULT_HABIT_ICON: IconName = 'check'

const LEGACY_EMOJI: Record<string, IconName> = {
  '✅': 'check',   '📓': 'journal', '💪': 'habit',  '😴': 'clock',
  '🧠': 'spark',   '📵': 'shield',  '📊': 'chart',  '📚': 'doc',
  '🏃': 'habit',   '🥗': 'target',  '💧': 'target', '🧘': 'shield',
  '📈': 'trendUp', '⏰': 'clock',   '🎯': 'target', '💡': 'spark',
}

/** Resolve whatever is stored on a habit to an icon we can actually draw. */
export function habitIcon(stored?: string | null): IconName {
  if (!stored) return DEFAULT_HABIT_ICON
  if (isIconName(stored)) return stored
  return LEGACY_EMOJI[stored] ?? DEFAULT_HABIT_ICON
}
