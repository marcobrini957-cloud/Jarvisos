'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Scroll reveal: content rises and fades in as it enters the viewport.
 *
 * Two things separate this from the usual version, and they are the difference
 * between "animated" and "considered":
 *
 *  - it only ever plays once, and only downward. Content that re-animates every
 *    time it re-enters draws attention to the mechanism.
 *  - the default distance is small (18px). Big travel reads as a template; the
 *    reference moves things barely at all, and the restraint is the point.
 *
 * Nothing is hidden in CSS by default — the initial state is applied by this
 * component after mount, so a crawler or a JS-off visitor sees fully visible
 * content. (The old landing learned this the hard way: hardcoding the reveal
 * class in markup hid sections in SSR.)
 */
export function Reveal({
  children, delay = 0, y = 18, as: Tag = 'div', className, style,
}: {
  children: React.ReactNode
  /** ms — stagger siblings by passing 60, 120, 180… */
  delay?: number
  /** px of upward travel */
  y?: number
  as?: 'div' | 'section' | 'li' | 'span'
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(true); return }
    setArmed(true)
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect() }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        ...style,
        ...(armed && !shown ? { opacity: 0, transform: `translate3d(0, ${y}px, 0)` } : { opacity: 1, transform: 'none' }),
        transition: armed
          ? `opacity 900ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 900ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`
          : undefined,
        willChange: armed && !shown ? 'opacity, transform' : undefined,
      }}
    >
      {children}
    </Tag>
  )
}
