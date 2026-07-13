'use client'

// ── Helpers ───────────────────────────────────────────────────────────────────
export function statusDot(status: string, lastSeen: string | null) {
  const isRecent = lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 15000
  const color =
    status === 'active' && isRecent ? '#00FF85' :
    status === 'active'             ? '#FFD700' :
    status === 'paused'             ? '#888'    :
    status === 'error'              ? '#FF3347' : '#444'
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, flexShrink: 0,
      boxShadow: (status === 'active' && isRecent) ? '0 0 6px #00FF85' : undefined,
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
