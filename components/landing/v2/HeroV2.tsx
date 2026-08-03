'use client'

import Link from 'next/link'
import { AnimatedDashboard } from '@/components/landing/AnimatedDashboard'
import { LogoMark } from '@/components/ui/LogoMark'
import { MarketClock } from './MarketClock'
import { Shell } from './ui'

/**
 * Landing hero.
 *
 * Second pass on the composition. The first put the headline and the argument
 * on the floor of an empty 100svh frame and pushed the product further down the
 * page in a band of its own. Marco's reference does the opposite and he is
 * right: copy across the top, then the product itself in a large framed box
 * that runs off the bottom edge. The cut-off is the point — it says there is
 * more of this, keep going — and it puts the thing you are selling in the fold
 * without the page reading as documentation.
 *
 * The box holds the animated replica, not a static shot: it is the 1:1 rebuild
 * of the real logged-in dashboard, with its own cursor and count-ups.
 *
 * Brand: Coolvetica, JetBrains Mono for figures, the sculpted V, and a live
 * session clock — the one element on the page a template could not carry.
 */

const NAV = [
  // In-page anchors: Lenis intercepts these and eases to the section rather
  // than jumping, which is the scroll Marco asked for on the nav links.
  { label: 'Product',   href: '#product' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing',   href: '#pricing' },
]

export function HeroV2() {
  return (
    <section
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        // The frame below is taller than what is left of the viewport, so the
        // product runs off the bottom rather than being shrunk to fit.
        overflow: 'hidden',
        paddingBottom: 'clamp(40px, 7vh, 90px)',
      }}
    >
      {/* ── Nav: a floating pill, not a full-width bar ── */}
      <header
        style={{
          position: 'relative', zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 44px)',
          gap: '20px',
        }}
      >
        {/* The real sculpted-V mark, not a text wordmark — the one thing on the
            page that could not belong to any other product. */}
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 1.4vw, 18px)',
            letterSpacing: '0.04em', color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          <LogoMark size={26} showBackground={false} />
          VELQUOR
        </Link>

        <nav
          className="hero2-nav"
          style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            padding: '6px 6px 6px 12px', borderRadius: '999px',
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
                padding: '9px 12px', borderRadius: '999px', textDecoration: 'none',
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

      {/* ── The claim ── */}
      <Shell style={{ position: 'relative', zIndex: 2, marginTop: 'clamp(28px, 6vh, 70px)' }}>
        <div className="hero2-copy" style={{
          display: 'grid', gridTemplateColumns: '1.15fr 0.85fr',
          gap: 'clamp(24px, 5vw, 64px)', alignItems: 'end',
        }}>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 5.6vw, 82px)',
                lineHeight: 0.94,
                letterSpacing: '-0.035em',
                color: '#fff',
              }}
            >
              Your edge is already
              <br />
              in your trades.
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: 'clamp(22px, 3vh, 34px)' }}>
              <Link
                href="/login"
                className="v2-pill"
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
                href="#product"
                className="v2-pill"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '13px 22px', borderRadius: '999px', textDecoration: 'none',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  color: '#fff',
                  fontFamily: 'var(--font-display)', fontSize: '15px', letterSpacing: '-0.01em',
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                }}
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="hero2-right" style={{ minWidth: 0, paddingBottom: '8px' }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(15px, 1.3vw, 19px)',
                lineHeight: 1.4,
                letterSpacing: '-0.015em',
                color: 'rgba(255,255,255,0.74)',
              }}
            >
              VELQUOR logs every trade from MetaTrader by itself, finds the
              behaviour costing you money, and mirrors positions across accounts
              in under two seconds.
            </p>
            {/* Live session state — the same sessions the dashboard grades by. */}
            <div style={{ marginTop: '16px' }}>
              <MarketClock />
            </div>
          </div>
        </div>
      </Shell>

      {/* ── The product, in the fold ──────────────────────────────────────────
          Framed like a screen and allowed to run off the bottom. Stage fits the
          replica to the width it is given but will not go below 50%, so on a
          phone the frame scrolls sideways instead of shrinking it into soup. */}
      <Shell style={{ position: 'relative', zIndex: 2, marginTop: 'clamp(34px, 6vh, 64px)' }}>
        <div className="v2-heroshot" style={{
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.11)',
          background: 'rgba(6,9,14,0.90)',
          boxShadow: '0 60px 120px -50px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.03) inset',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}>
          <AnimatedDashboard />
        </div>
      </Shell>

      <style>{`
        .hero2-nav a:hover { color: #fff; background: rgba(255,255,255,0.07); }

        /* ⚠️ Every declaration below that has a matching inline style needs
           !important. These elements are styled with the style attribute, which
           beats a stylesheet rule regardless of media query. */
        @media (max-width: 980px) {
          .hero2-copy { grid-template-columns: 1fr !important; gap: 26px !important; align-items: start !important; }
          .hero2-right { padding-bottom: 0 !important; }
        }

        @media (max-width: 880px) {
          /* Keep the anchors — they are the navigation — and drop the
             "Get started" pill, which only repeats "Start free" in the fold. */
          .hero2-nav { padding: 5px 5px !important; gap: 0 !important; }
          .hero2-nav a { padding: 8px 8px !important; font-size: 12px !important; }
          .hero2-nav a:last-child { display: none !important; }
        }

        @media (max-width: 460px) {
          /* Four anchors will not fit a small phone. "How it works" is the one
             the page already explains on the way down. */
          .hero2-nav a { padding: 8px 7px !important; font-size: 11px !important; }
          .hero2-nav a:nth-child(3) { display: none !important; }
        }
      `}</style>
    </section>
  )
}
