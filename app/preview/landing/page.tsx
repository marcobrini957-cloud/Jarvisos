import type { Metadata } from 'next'
import { HeroV2 } from '@/components/landing/v2/HeroV2'
import { Atmosphere } from '@/components/landing/v2/Atmosphere'
import { SmoothScroll } from '@/components/landing/v2/SmoothScroll'
import {
  FeatureRow, StickyAudiences, ClosingCTA,
  VisualAutoSync, VisualAnalysis, VisualCopier,
} from '@/components/landing/v2/Sections'
import {
  BrokerStrip, TraderDnaBand, BeforeAfterBand, FeatureGrid,
  HowItWorksBand, AnalystBand, PropFirmBand, TrustBand,
  PricingBand, FaqBand, FooterBand,
} from '@/components/landing/v2/Bands'

/**
 * Preview route for the second landing direction.
 *
 * Now carries the whole of the live landing's content — every section, price,
 * FAQ answer and broker — rebuilt in this language rather than summarised. The
 * live landing stays untouched until Marco says to swap.
 *
 * Nav anchors (#product, #how, #pricing) are handled by Lenis, so clicking one
 * eases there rather than jumping.
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
          background: 'linear-gradient(to bottom, rgba(5,7,10,0) 0%, rgba(5,7,10,0) 42%, rgba(5,7,10,0.80) 100%)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <HeroV2 />

        <BrokerStrip />

        {/* The three pillars, as full-bleed alternating rows. */}
        <div id="product" style={{ scrollMarginTop: '90px' }}>
          <FeatureRow
            index="01"
            eyebrow="Auto-sync"
            heading={<>Never type a trade<br />into anything. Ever.</>}
            body="Connect MetaTrader once. Entry, stop, target, open and close time, P&L — in your journal automatically, the moment a trade closes. Your last 30 days import on connection, so you start with data instead of a blank page. You add the setup and how you felt: ten seconds, and that is the entire manual workload."
            cta="See how it connects"
            href="/connect"
            visual={<VisualAutoSync />}
          />

          <FeatureRow
            index="02"
            eyebrow="Analysis"
            heading={<>The pattern costing<br />you money.</>}
            body="Win rate by setup, by session, by hour, by how you felt going in. Graded against what you actually did, with the rule for every score written underneath it — so you can argue with the number instead of trusting it."
            cta="See the analysis"
            href="/login"
            flip
            visual={<VisualAnalysis />}
          />

          <FeatureRow
            index="03"
            eyebrow="Copier"
            heading={<>One account leads.<br />The rest follow.</>}
            body="Mirror positions across accounts at 1:1, proportional or a fixed lot, same broker or not. Measured at 0.3 to 0.55 seconds from signal to delivery — the rest is your broker's fill time."
            cta="See the copier"
            href="/login"
            visual={<VisualCopier />}
          />
        </div>

        <BeforeAfterBand />
        <TraderDnaBand />
        <FeatureGrid />
        <HowItWorksBand />
        <AnalystBand />
        <PropFirmBand />
        <StickyAudiences />
        <TrustBand />
        <PricingBand />
        <FaqBand />
        <ClosingCTA />
        <FooterBand />
      </div>
    </div>
  )
}
