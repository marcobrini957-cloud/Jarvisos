'use client'

import { useState, useEffect } from 'react'

export function useIsMobile() {
  // Must start `false` on the client too, not read from window in the lazy
  // initialiser. The server has no window, so it always rendered the DESKTOP
  // tree — while a phone hydrated straight into the MOBILE tree and React threw
  // a hydration mismatch on every mobile dashboard load. Matching the server on
  // the first client render costs one frame and fixes it.
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
export function fmtEur(n: number, dec = 2) {
  return `€${n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
}
export function fmtPnl(n: number) {
  return `${n >= 0 ? '+' : '-'}€${Math.abs(n).toFixed(2)}`
}
export function fullDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// A mood is not a P&L. Profit-green on "great" put a feeling in the same
// colour as money on screens that show both — most obviously the mood-to-P&L
// correlation chart, where the two meanings sat side by side.
export const MOOD_COLOR: Record<string, string> = {
  great: 'var(--color-key)', good: 'var(--color-key)', neutral: 'var(--color-ink-2)',
  low: 'var(--color-warn)', bad: 'var(--color-warn)',
}
