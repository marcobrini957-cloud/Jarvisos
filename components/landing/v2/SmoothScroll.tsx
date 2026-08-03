'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Inertial smooth scrolling.
 *
 * Marco pointed at a reference site and said the motion was most of why it felt
 * professional. A good part of that is not any one animation — it is that the
 * whole page scrolls with weight instead of snapping a fixed number of pixels
 * per wheel notch. That reference runs Lenis; so does this.
 *
 * Two rules it must not break:
 *  - prefers-reduced-motion gets native scrolling, untouched. Hijacking the
 *    scrollbar for someone who has asked the OS for less motion is the kind of
 *    thing that makes people motion-sick, not impressed.
 *  - touch devices keep their native momentum. Phone browsers already do this
 *    well and overriding it fights the platform.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // ⚠️ This app does not scroll the window. The root layout puts `h-full` on
    // <html> and the body carries `overflow-y: auto`, so the BODY is the
    // scrolling element (the same thing that makes window.scrollTo a no-op in
    // our browser tests). Lenis defaults to the window, and left on that
    // default it takes over the wheel and then scrolls something that never
    // moves — the page simply stops scrolling. Measured: body.scrollTop stayed
    // at 0 with Lenis on and reached 1500 with it off.
    const bodyScrolls =
      document.body.scrollHeight > document.body.clientHeight &&
      getComputedStyle(document.body).overflowY !== 'visible'

    const content = (document.querySelector('.landing-root') as HTMLElement) ?? document.body

    const lenis = new Lenis({
      ...(bodyScrolls ? { wrapper: document.body, content } : {}),
      // ~1.1s to settle: slow enough to feel weighted, short enough that
      // someone flicking to the footer is not held hostage by the easing.
      duration: 1.1,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native momentum on touch is better than anything we'd impose.
      syncTouch: false,
    })

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // In-page anchors have to go through Lenis or they jump while the rest of
    // the page eases, which reads as a bug.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
      const id = a?.getAttribute('href')
      if (!id || id === '#') return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target as HTMLElement, { offset: -80 })
    }
    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  return null
}
