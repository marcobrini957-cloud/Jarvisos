import { HeroV2 } from '@/components/landing/v2/HeroV2'
import { Atmosphere } from '@/components/landing/v2/Atmosphere'
import { SmoothScroll } from '@/components/landing/v2/SmoothScroll'
import {
  FeatureRow, ClosingCTA,
  VisualAutoSync, VisualAnalysis, VisualCopier,
} from '@/components/landing/v2/Sections'
import { SolutionsStack } from '@/components/landing/v2/Solutions'
import { TrailerBand } from '@/components/landing/v2/TrailerBand'
import { StatsBand } from '@/components/landing/v2/StatsBand'
import {
  BrokerStrip, TraderDnaBand, BeforeAfterBand, FeatureGrid,
  HowItWorksBand, AnalystBand, PropFirmBand, TrustBand,
  PricingBand, FaqBand, FooterBand,
} from '@/components/landing/v2/Bands'
import { FAQS } from '@/components/landing/v2/faqData'

/**
 * The landing page.
 *
 * Promoted from /preview/landing on 2026-08-03. The previous design is not
 * deleted — it still builds, and it is parked at /preview/landing-v1 so the two
 * can be compared before anything is thrown away.
 *
 * Title, description, OG and Twitter cards all come from the root layout, so
 * this page inherits them; only the FAQ rich-result data is page-specific.
 */

export default function LandingPage() {
  return (
    <div className="landing-root vq2" style={{ background: '#05070a', color: '#fff', position: 'relative' }}>
      <SmoothScroll />

      {/* One continuous background for the entire page. Fixed rather than
          repeated per section — that single commitment is most of why the
          page reads as one designed object instead of stacked blocks. */}
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

        <TrailerBand />

        <StatsBand />

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
        <SolutionsStack />
        <TrustBand />
        <PricingBand />
        <FaqBand />
        <ClosingCTA />
        <FooterBand />
      </div>

      {/* FAQ rich-result structured data. Generated from the same array the
          FAQ section renders, because Google requires the markup to match the
          visible answers — the old page built this from a translations file
          that had drifted from the copy on screen. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map(([q, a]) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          }),
        }}
      />
    </div>
  )
}
