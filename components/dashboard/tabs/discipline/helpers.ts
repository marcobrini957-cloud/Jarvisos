// ── Constants ─────────────────────────────────────────────────────────────────

export const TODAY = new Date().toISOString().split('T')[0]

// Five habit categories used to mean five hues. A category is a word — it does
// not need a colour, and green here competed with green meaning profit.
export const CATEGORY_COLORS: Record<string, string> = {
  trading: 'var(--color-ink-1)',
  mindset: 'var(--color-ink-2)',
  health:  'var(--color-ink-2)',
  growth:  'var(--color-ink-2)',
  general: 'var(--color-ink-3)',
}

export function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'var(--color-ink-3)'
}

export function last7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

// ── Shared input style ────────────────────────────────────────────────────────

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-line-1)',
  borderRadius: 'var(--radius-sm)',
  padding: '7px 10px',
  color: 'var(--color-ink-1)',
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--text-base)',
  outline: 'none',
}
