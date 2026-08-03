import type { Metadata } from 'next'
import { HeroV2 } from '@/components/landing/v2/HeroV2'
import { Atmosphere } from '@/components/landing/v2/Atmosphere'
import { SmoothScroll } from '@/components/landing/v2/SmoothScroll'
import {
  ProofStrip, FeatureRow, StickyAudiences, ClosingCTA,
  VisualAutoSync, VisualAnalysis, VisualCopier,
} from '@/components/landing/v2/Sections'

/**
 * Preview route for the second landing direction.
 *
 * The live landing is hand-tuned, so this sits beside it rather than replacing
 * it — Marco looks at /preview/landing, and only then do we swap. Kept out of
 * search results: it is a work in progress, not a second front door.
 *
 * Structure follows the reference Marco sent: one background fixed behind the
 * whole document, a hero that does not centre anything, alternating feature
 * rows, a sticky stack, and a closing CTA. Content is VELQUOR's own.
 */
export const metadata: Metadata = {
  title: 'VELQUOR — landing preview',
  robots: { index: false, follow: false },
}

export default function LandingPreviewPage() {
  return (
    <div className="landing-root vq2" style={{ background: '#05070a', color: '#fff', position: 'relative' }}>
      <SmoothScroll />

      {/* One continuous background for the entire page. Fixed rather than
          repeated per section — that single commitment is most of why the
          reference reads as one designed object instead of stacked blocks. */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <Atmosphere />
        {/* Below the fold the art has done its job; darkening it keeps body
            copy readable without giving the sections their own backgrounds. */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(5,7,10,0) 0%, rgba(5,7,10,0) 55%, rgba(5,7,10,0.72) 100%)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <HeroV2 />

        <ProofStrip />

        <FeatureRow
          index="01"
          eyebrow="Feature 1"
          heading={<>Every trade logs<br />itself.</>}
          body="Connect MetaTrader once. Fills, size, stops, screenshots at open and close — written down while you are still watching the chart. There is nothing to fill in afterwards, which is the only reason it actually gets done."
          cta="See how it connects"
          href="/connect"
          visual={<VisualAutoSync />}
        />

        <FeatureRow
          index="02"
          eyebrow="Feature 2"
          heading={<>The pattern costing<br />you money.</>}
          body="Win rate by setup, by session, by hour, by how you felt going in. Graded against what you actually did, with the rule for every score written under it — so you can argue with the number instead of trusting it."
          cta="See the analysis"
          href="/login"
          flip
          visual={<VisualAnalysis />}
        />

        <FeatureRow
          index="03"
          eyebrow="Feature 3"
          heading={<>One account leads.<br />The rest follow.</>}
          body="Mirror positions across accounts at 1:1 or your own multiplier, same broker or not. Measured at 0.3 to 0.55 seconds from signal to delivery — the rest is your broker's fill time."
          cta="See the copier"
          href="/login"
          visual={<VisualCopier />}
        />

        <StickyAudiences />
        <ClosingCTA />
      </div>
    </div>
  )
}
