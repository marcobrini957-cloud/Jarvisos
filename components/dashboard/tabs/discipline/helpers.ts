// ── Constants ─────────────────────────────────────────────────────────────────

export const TODAY = new Date().toISOString().split('T')[0]

export const CATEGORY_COLORS: Record<string, string> = {
  trading: 'var(--ac)',
  mindset: 'var(--pu)',
  health:  'var(--gr2)',
  growth:  'var(--am2)',
  general: 'var(--t2)',
}

export function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'var(--t2)'
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
  background: 'var(--s2)',
  border: '1px solid var(--bd2)',
  borderRadius: '8px',
  padding: '10px 12px',
  color: 'var(--t1)',
  fontSize: '13px',
  outline: 'none',
}
