'use client'

import { AnimatedDashboard } from '@/components/landing/AnimatedDashboard'
import { Reveal } from './Reveal'
import { Eyebrow, H2, Body, Shell } from './ui'

export function TrailerBand() {
  return (
    <section id="trailer" style={{ padding: 'clamp(70px, 10vh, 120px) 0', scrollMarginTop: '90px' }}>
      <Shell>
        <Reveal><Eyebrow>The product</Eyebrow></Reveal>
        <Reveal delay={70}>
          <H2 style={{ marginTop: '20px', maxWidth: '20ch' }}>
            This is what it looks like the day after you connect.
          </H2>
        </Reveal>
        <Reveal delay={140}>
          <Body style={{ marginTop: '20px', maxWidth: '54ch' }}>
            Not a mock-up of a product we intend to build — a replica of the real
            dashboard, drawn from the live one. Every figure on it came out of a
            MetaTrader account.
          </Body>
        </Reveal>

        <Reveal delay={200}>
          <div className="v2-trailer" style={{
            marginTop: 'clamp(34px, 5vh, 54px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(6,9,14,0.86)',
            boxShadow: '0 50px 100px -50px rgba(0,0,0,0.95)',
            // Stage fits the replica to the width it is given but refuses to
            // go below minScale 0.5, so on a phone it draws a ~620px canvas.
            // Rather than shrink it into soup, the frame scrolls: the page
            // itself never overflows, and the dashboard stays readable.
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}>
            <AnimatedDashboard />
          </div>
        </Reveal>
      </Shell>
    </section>
  )
}
