'use client'

import Link from 'next/link'

/**
 * Landing hero, second direction.
 *
 * What was wrong with the first one was never the typeface — Coolvetica at
 * 104px with −0.035em tracking is more distinctive than the reference's DM
 * Sans. It was three other things, all fixed here:
 *
 *  1. Everything was centred. Eyebrow, headline, body, buttons, feature chips —
 *     all on one axis. Dead-centre symmetry is the loudest signal of a template.
 *     This hero puts the headline bottom-left and the argument bottom-right,
 *     with the top two-thirds left empty for the light to do the work.
 *  2. A blue primary button. An accent-coloured CTA on near-black is the single
 *     most-copied SaaS pattern there is. This hero has no accent colour at all:
 *     white on dark, and the eye goes to the brightest thing, which is the type.
 *  3. No atmosphere. Flat #000 with a product screenshot floating on it. The
 *     screenshot now waits until after the fold has made its argument.
 *
 * Brand is unchanged: Coolvetica, JetBrains Mono for figures, true black.
 */

const NAV = [
  // In-page anchors: Lenis intercepts these and eases to the section rather
  // than jumping, which is the scroll Marco asked for on the nav links.
  { label: 'Product',      href: '#product' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing',      href: '#pricing' },
]

export function HeroV2() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* The background is fixed at page level (see the preview route) so it
          runs continuously behind every section, the way the reference does. */}

      {/* A floor of shadow so the bottom-aligned type always has contrast,
          whatever the shader happens to be doing down there. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 32%, rgba(0,0,0,0) 62%)',
        }}
      />

      {/* ── Nav: a floating pill, not a full-width bar ── */}
      <header
        style={{
          position: 'relative', zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(20px, 3vw, 34px) clamp(20px, 4vw, 44px)',
          gap: '20px',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 1.4vw, 18px)',
            letterSpacing: '0.04em', color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          VELQUOR
        </Link>

        <nav
          className="hero2-nav"
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '6px 6px 6px 14px', borderRadius: '999px',
            background: 'rgba(255,255,255,0.055)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {NAV.map(n => (
            <Link
              key={n.label}
              href={n.href}
              style={{
                padding: '9px 14px', borderRadius: '999px', textDecoration: 'none',
                fontFamily: 'var(--font-display)', fontSize: '14px',
                letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap',
              }}
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '9px 8px 9px 16px', borderRadius: '999px', textDecoration: 'none',
              background: '#000', border: '1px solid rgba(255,255,255,0.14)',
              fontFamily: 'var(--font-display)', fontSize: '14px', color: '#fff', whiteSpace: 'nowrap',
            }}
          >
            Get started
            <span
              aria-hidden
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '22px', height: '22px', borderRadius: '999px',
                background: '#fff', color: '#000', fontSize: '11px', lineHeight: 1,
              }}
            >→</span>
          </Link>
        </nav>
      </header>

      {/* ── The fold ── */}
      <div
        className="hero2-body"
        style={{
          position: 'relative', zIndex: 2,
          flex: 1, display: 'flex', alignItems: 'flex-end',
          padding: '0 clamp(20px, 4vw, 44px) clamp(36px, 6vh, 76px)',
          gap: 'clamp(24px, 5vw, 72px)',
        }}
      >
        {/* Left: the claim */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(42px, 7.4vw, 118px)',
              lineHeight: 0.92,
              letterSpacing: '-0.035em',
              color: '#fff',
              textWrap: 'balance',
            }}
          >
            Your edge is already
            <br />
            in your trades.
          </h1>

          <p
            style={{
              margin: 'clamp(18px, 2.4vh, 30px) 0 0',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(13px, 1.05vw, 15px)',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.42)',
            }}
          >
            Auto-sync · Analysis · Copier
          </p>
        </div>

        {/* Right: the argument, and the way in */}
        <div
          className="hero2-right"
          style={{ flex: '0 1 430px', minWidth: 0, paddingBottom: '6px' }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(16px, 1.45vw, 20px)',
              lineHeight: 1.35,
              letterSpacing: '-0.015em',
              color: 'rgba(255,255,255,0.80)',
            }}
          >
            VELQUOR logs every trade from MetaTrader by itself, finds the
            behaviour costing you money, and mirrors positions across accounts
            in under two seconds.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: 'clamp(20px, 2.6vh, 30px)' }}>
            <Link
              href="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '13px 12px 13px 22px', borderRadius: '999px', textDecoration: 'none',
                background: '#fff', color: '#000',
                fontFamily: 'var(--font-display)', fontSize: '15px', letterSpacing: '-0.01em',
              }}
            >
              Start free
              <span
                aria-hidden
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '24px', height: '24px', borderRadius: '999px',
                  background: '#000', color: '#fff', fontSize: '11px', lineHeight: 1,
                }}
              >→</span>
            </Link>
            <Link
              href="/pricing"
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '13px 22px', borderRadius: '999px', textDecoration: 'none',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.13)',
                color: '#fff',
                fontFamily: 'var(--font-display)', fontSize: '15px', letterSpacing: '-0.01em',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              See pricing
            </Link>
          </div>

          <p
            style={{
              margin: '16px 0 0',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px', letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.34)',
            }}
          >
            No card required · Works with any MT5 broker
          </p>
        </div>
      </div>

      <style>{`
        .hero2-nav a:hover { color: #fff; background: rgba(255,255,255,0.07); }

        /* ⚠️ Every declaration below that has a matching inline style needs
           !important. These elements are styled with the style attribute, which
           beats a stylesheet rule regardless of media query — without it the
           mobile nav kept its desktop padding and the "Get started" pill never
           hid, pushing the bar 117px past the right edge of a 390px screen. */
        @media (max-width: 880px) {
          /* Stack, and keep the whole block bottom-aligned the way the desktop
             composition is. Without the flex reset, the left column's
             "flex: 1 1 auto" grows down the column axis and opens ~350px of
             dead space between the headline and the buttons. */
          .hero2-body { flex-direction: column; align-items: stretch !important; justify-content: flex-end; gap: 26px !important; }
          .hero2-body > div { flex: 0 0 auto !important; width: 100%; }

          /* The nav used to hide every link except the CTA, which left a phone
             with no way to reach Product / How it works / Pricing at all. Keep
             the anchors — they are the navigation — and drop the "Get started"
             pill, which only duplicates the "Start free" button in the fold. */
          .hero2-nav { padding: 5px 6px !important; gap: 0 !important; }
          .hero2-nav a { padding: 8px 9px !important; font-size: 12px !important; }
          .hero2-nav a:last-child { display: none !important; }
        }

        @media (max-width: 400px) {
          .hero2-nav a { padding: 8px 7px !important; font-size: 11px !important; }
        }
      `}</style>
    </section>
  )
}
