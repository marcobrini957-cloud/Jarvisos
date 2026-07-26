'use client'

// ── Helpers ───────────────────────────────────────────────────────────────────
export function statusDot(status: string, lastSeen: string | null) {
  const isRecent = lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 15000
  const color =
    status === 'active' && isRecent ? 'var(--color-up)'     :
    status === 'active'             ? 'var(--color-ink-1)'  :
    status === 'paused'             ? 'var(--color-ink-3)'  :
    status === 'error'              ? 'var(--color-down)'   : 'var(--color-ink-4)'
  return (
    <span style={{
      display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
      background: color, flexShrink: 0,
    }} />
  )
}

export function timeAgo(ts: string | null) {
  if (!ts) return 'never'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}
