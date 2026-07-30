'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/LogoMark'
import { CtaLink } from './CtaLink'
import { useLocale } from '@/hooks/useLocale'

/**
 * The site bar, on the 2.0 language.
 *
 * What it used to be: a 62px bar with a 680px "mega dropdown" whose six items
 * all pointed at the same `#features` anchor, a gold gradient tile, glyph
 * icons standing in for real ones, a gold FREE badge, and a white CTA sitting
 * in its own glow. That dropdown was decoration wearing the clothes of
 * navigation — it took a click to reach anchors the bar could hold directly.
 * It is gone, and the four links it hid are on the bar.
 *
 * The wordmark is the dashboard's, exactly: LogoMark plus Coolvetica Heavy
 * Compressed. Signed-out and signed-in should not look like two products.
 */

const LINKS: [string, string][] = [
  ['Product',      '/#features'],
  ['How it works', '/#how'],
  ['Pricing',      '/pricing'],
  ['FAQ',          '/#faq'],
]

export function Nav() {
  const { t } = useLocale()
  const [scrolled, setScrolled] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  // Whether to say "Sign in" or "Dashboard" — read from the cookie, not from
  // the Supabase client. Importing that client here pulled 237kB of JS (the
  // single largest script on the landing page, measured 2026-07-30) onto every
  // anonymous visit, to answer a question a cookie already answers. @supabase/ssr
  // writes `sb-<project-ref>-auth-token`, chunked as `.0`/`.1` when it is long.
  // Being wrong is harmless in both directions: the dashboard bounces anyone
  // without a session, and /login forwards anyone who has one.
  useEffect(() => {
    setLoggedIn(/(^|;\s*)sb-[^=]+-auth-token(\.\d+)?=/.test(document.cookie))
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const h = () => setMenuOpen(false)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [menuOpen])

  const linkStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
    color: 'var(--color-ink-3)', textDecoration: 'none',
    padding: '6px 10px', borderRadius: 'var(--radius-sm)',
    whiteSpace: 'nowrap', transition: 'color 0.12s',
  }

  return (
    <>
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 40px)',
          height: '52px', padding: '0 clamp(14px, 4vw, 32px)',
          background: scrolled || menuOpen ? 'var(--color-void)' : 'transparent',
          borderBottom: `1px solid ${scrolled || menuOpen ? 'var(--color-line-1)' : 'transparent'}`,
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <Link
          href={loggedIn ? '/dashboard' : '/'}
          onClick={() => setMenuOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', flexShrink: 0 }}
        >
          <LogoMark size={22} />
          <span style={{
            fontFamily: 'var(--font-mark)', fontSize: 'var(--text-xl)', lineHeight: 1,
            letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-ink-1)',
          }}>
            Velquor
          </span>
        </Link>

        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '2px', flex: 1 }}>
          {LINKS.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              prefetch={false}
              style={linkStyle}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink-1)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-3)')}
            >
              {label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexShrink: 0 }}>
          <Link
            href={loggedIn ? '/dashboard' : '/login'}
            className="hidden sm:block"
            prefetch={false}
            style={linkStyle}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-3)')}
          >
            {loggedIn ? 'Dashboard' : t.nav.signIn}
          </Link>
          <CtaLink href="/login?mode=signup" where="nav" className="hidden sm:block" style={ctaStyle}>
            {t.nav.getStarted}
          </CtaLink>

          {/* Mobile — the dashboard's own menu button, same folding lines */}
          <button
            className="sm:hidden"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="vq-site-menu"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '30px', height: '28px', flexShrink: 0,
              background: menuOpen ? 'var(--color-surface-2)' : 'transparent',
              border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-sm)',
              color: 'var(--color-ink-1)', cursor: 'pointer', transition: 'background 0.12s',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <line x1="2.5" y1="4.5" x2="13.5" y2="4.5" style={{
                transform: menuOpen ? 'translateY(3.5px) rotate(45deg)' : 'none',
                transformOrigin: 'center', transition: 'transform 0.2s ease',
              }} />
              <line x1="2.5" y1="8" x2="13.5" y2="8" style={{ opacity: menuOpen ? 0 : 1, transition: 'opacity 0.12s ease' }} />
              <line x1="2.5" y1="11.5" x2="13.5" y2="11.5" style={{
                transform: menuOpen ? 'translateY(-3.5px) rotate(-45deg)' : 'none',
                transformOrigin: 'center', transition: 'transform 0.2s ease',
              }} />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile sheet — anchored under the bar, hairline, opaque. No blur, no
          24px radius, no drop shadow: the same sheet the dashboard uses. */}
      <div
        id="vq-site-menu"
        className="sm:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        style={{
          position: 'fixed', left: 0, right: 0, top: '52px', zIndex: 99,
          background: 'var(--s1)', borderBottom: '1px solid var(--color-line-2)',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          transform: menuOpen ? 'translateY(0)' : 'translateY(-102%)',
          visibility: menuOpen ? 'visible' : 'hidden',
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: menuOpen
            ? 'transform 0.26s cubic-bezier(0.16,1,0.3,1)'
            : 'transform 0.26s cubic-bezier(0.16,1,0.3,1), visibility 0s linear 0.26s',
          padding: '4px 12px 16px',
        }}
      >
        {LINKS.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            prefetch={false}
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'block', padding: '13px 2px',
              borderBottom: '1px solid var(--color-line-1)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
              color: 'var(--color-ink-2)', textDecoration: 'none',
            }}
          >
            {label}
          </Link>
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <Link
            href={loggedIn ? '/dashboard' : '/login'}
            prefetch={false}
            onClick={() => setMenuOpen(false)}
            style={{
              flex: 1, textAlign: 'center', padding: '11px',
              border: '1px solid var(--color-line-2)', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
              color: 'var(--color-ink-1)', textDecoration: 'none',
            }}
          >
            {loggedIn ? 'Dashboard' : t.nav.signIn}
          </Link>
          <CtaLink
            href="/login?mode=signup"
            where="nav-mobile"
            onClick={() => setMenuOpen(false)}
            style={{ ...ctaStyle, flex: 1, textAlign: 'center', padding: '11px' }}
          >
            {t.nav.getStarted}
          </CtaLink>
        </div>
      </div>
    </>
  )
}

/** Ink on void. The product's only button style — no glow, no gradient. */
const ctaStyle: React.CSSProperties = {
  background: 'var(--color-ink-1)', color: 'var(--color-void)',
  fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
  textDecoration: 'none', padding: '7px 16px',
  borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
  transition: 'opacity 0.12s',
}
