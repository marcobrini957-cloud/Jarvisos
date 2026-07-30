'use client'

import { useEffect } from 'react'

/**
 * Page-level scrolling for the marketing pages.
 *
 * This used to also drive a fade-up-on-scroll reveal on every `<section>` —
 * which DESIGN.md §2 bans by name, and which Stage 4 missed. Two reasons it is
 * gone rather than tuned: the ban is about the pattern, not its duration, and
 * a reader who scrolls quickly was arriving at content that had not finished
 * animating in. Sections are simply there now.
 */
export function ScrollSetup() {
  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflowX = 'hidden'
    document.documentElement.style.overflowX = 'hidden'

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.overflowX = ''
      document.documentElement.style.overflowX = ''
    }
  }, [])
  return null
}
