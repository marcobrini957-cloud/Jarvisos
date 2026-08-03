'use client'

import { AnimatedDashboard } from '@/components/landing/AnimatedDashboard'
import { Reveal } from './Reveal'
import { Shell } from './ui'

/**
 * The animated dashboard, in a lit glass case.
 *
 * Third arrangement, and the one Marco asked for. It briefly lived inside the
 * hero, which put the product in the first thing you see — he preferred the
 * fold staying quiet and the dashboard arriving as a reward for scrolling. So
 * it sits here instead: the first thing below the fold, before the broker
 * strip, in a box that is lit rather than merely outlined.
 *
 * "Illuminated" is doing real work, not decoration. Three layers:
 *  · a wide brand-blue bloom behind the case, so it looks lit from behind
 *    rather than pasted onto the background;
 *  · a hairline top edge that runs bright in the middle and fades at the
 *    corners — the way a real edge catches a light source above it;
 *  · glass over all of it, so the atmosphere shader stays faintly visible
 *    through the frame and the box belongs to the page.
 *
 * The caption sits inside the case, above the replica, so the thing and its
 * explanation are one object.
 */
export function TrailerBand() {
  return (
    <section id="trailer" style={{ padding: 'clamp(70px, 11vh, 130px) 0 clamp(20px, 3vh, 40px)', scrollMarginTop: '90px' }}>
      <Shell>
        <Reveal>
          <div style={{ position: 'relative' }}>
            {/* The bloom. Sits behind the case and is deliberately wider than
                it, which is what separates "lit" from "has a border". */}
            <div
              aria-hidden
              style={{
                position: 'absolute', inset: '-14% -6% -18%',
                background: 'radial-gradient(58% 50% at 50% 8%, rgba(77,143,255,0.20), rgba(77,143,255,0.05) 45%, transparent 72%)',
                filter: 'blur(28px)',
                pointerEvents: 'none',
              }}
            />

            <div
              className="v2-case"
              style={{
                position: 'relative',
                borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018) 34%, rgba(6,9,14,0.72))',
                backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                boxShadow: '0 50px 110px -50px rgba(0,0,0,0.95), 0 0 60px -20px rgba(77,143,255,0.22)',
                overflow: 'hidden',
              }}
            >
              {/* The lit top edge. */}
              <div
                aria-hidden
                style={{
                  position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(180,210,255,0.85), transparent)',
                }}
              />

              {/* Caption — what the animation is, inside the case with it. */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'baseline',
                justifyContent: 'space-between', gap: '12px',
                padding: 'clamp(20px, 2.6vw, 30px) clamp(20px, 2.6vw, 32px) clamp(16px, 2vw, 22px)',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontFamily: 'var(--font-display)', fontSize: '11px',
                    letterSpacing: '0.28em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.42)',
                  }}>Live replica</p>
                  <p style={{
                    margin: '10px 0 0', fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(15px, 1.4vw, 19px)', lineHeight: 1.4,
                    letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.82)',
                    maxWidth: '62ch',
                  }}>
                    The real dashboard, rebuilt from the live product — this is what
                    it looks like the day after you connect MetaTrader. Every figure
                    on it came out of a trading account.
                  </p>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)',
                  whiteSpace: 'nowrap',
                }}>
                  <span aria-hidden style={{
                    width: '6px', height: '6px', borderRadius: '999px',
                    background: 'var(--ac, #4D8FFF)',
                  }} />
                  Playing
                </span>
              </div>

              {/* The replica. Stage fits it to the width it is given but will
                  not go below 50%, so on a phone this scrolls sideways rather
                  than being shrunk into soup — the page never overflows. */}
              <div style={{
                margin: '0 clamp(12px, 1.6vw, 20px) clamp(12px, 1.6vw, 20px)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(4,6,10,0.86)',
                overflowX: 'auto', overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
              }}>
                <AnimatedDashboard />
              </div>
            </div>
          </div>
        </Reveal>
      </Shell>
    </section>
  )
}
