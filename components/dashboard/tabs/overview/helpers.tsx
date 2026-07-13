'use client'

import { useState, useEffect } from 'react'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  )
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

export const MOOD_COLOR: Record<string, string> = {
  great: 'var(--gr2)', good: 'var(--gr2)', neutral: 'var(--am2)', low: 'var(--re)', bad: 'var(--re)',
}
