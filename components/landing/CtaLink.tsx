'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'

/**
 * A call-to-action that warms its destination on intent rather than on sight.
 *
 * Measured 2026-07-30: a cold landing visit fired sixteen router prefetches —
 * five of them for /privacy — and the one for /login pulled a 236kB chunk
 * (@supabase/ssr + GoTrue) that the marketing page has no other reason to
 * download. Next prefetches every `<Link>` that enters the viewport, and this
 * page is 13,000px of links.
 *
 * Turning prefetch off entirely would trade that for a slower click on the one
 * link that matters. So: off by default, then `router.prefetch()` on hover,
 * focus or touch-start. A pointer reaches a button ~200-300ms before it clicks
 * and a thumb lands before it lifts, which is enough to have the route warm —
 * and a visitor who never reaches for the button never pays for it.
 */
export function CtaLink({ href, where, style, className, children, onClick }: {
  href: string
  /** Which section this button sits in — the only thing that tells us where
      the funnel actually converts. */
  where: string
  style?: CSSProperties
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  const router = useRouter()
  const warm = () => router.prefetch(href)
  const click = () => { trackEvent({ name: 'cta_click', where }); onClick?.() }

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      onClick={click}
      style={style}
      className={className}
    >
      {children}
    </Link>
  )
}
