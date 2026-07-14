'use client'

import { useEffect } from 'react'

// Landing page needs page-level scrolling; the dashboard locks body overflow.
// Also drives the section scroll-reveal: classes are applied from JS only, so
// crawlers and no-JS visitors always get fully visible content.
export function ScrollSetup() {
  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflowX = 'hidden'
    document.documentElement.style.overflowX = 'hidden'

    const sections = Array.from(document.querySelectorAll<HTMLElement>('main section, .landing-root section'))
    // Skip anything already in the viewport on load (hero etc.) — revealing
    // visible content would flash it out and back in.
    const vh = window.innerHeight
    const below = sections.filter(s => s.getBoundingClientRect().top > vh * 0.85)
    below.forEach(s => s.classList.add('vq-reveal'))

    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('vq-in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    )
    below.forEach(s => io.observe(s))

    return () => {
      io.disconnect()
      sections.forEach(s => s.classList.remove('vq-reveal', 'vq-in'))
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.overflowX = ''
      document.documentElement.style.overflowX = ''
    }
  }, [])
  return null
}
