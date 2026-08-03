import type { Metadata } from 'next'
import { Nav } from '@/components/landing/Nav'
import { Hero } from '@/components/landing/Hero'
import { ThreePillars } from '@/components/landing/ThreePillars'
import { TraderDnaSection } from '@/components/landing/TraderDnaSection'
import { StatsBar } from '@/components/landing/StatsBar'
import { ShowcaseSection } from '@/components/landing/ShowcaseSection'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { VelquorSection } from '@/components/landing/VelquorSection'
import { PropFirmSection } from '@/components/landing/PropFirmSection'
import { Pricing } from '@/components/landing/Pricing'
import { TrustSection } from '@/components/landing/TrustSection'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { getTranslations } from '@/lib/i18n/translations'
import { FooterTagline } from '@/components/landing/FooterTagline'
import { Footer } from '@/components/landing/Footer'
import { ScrollSetup } from '@/components/landing/ScrollSetup'

/**
 * The previous landing, parked.
 *
 * Kept buildable and reachable so the two designs can be compared before
 * anything is deleted — the new one went live at / on 2026-08-03. Noindex'd:
 * two crawlable copies of the same pitch is a duplicate-content problem.
 */
export const metadata: Metadata = {
  title: 'VELQUOR — previous landing',
  robots: { index: false, follow: false },
}

export default function LandingV1Page() {
  return (
    <div className="landing-root vq2" style={{ background: 'var(--bg)', color: 'var(--t1)', overflowX: 'hidden' }}>
      <ScrollSetup />
      <Nav />
      <Hero />
      {/* proof numbers immediately after the hero, before the pitch */}
      <StatsBar />
      <ThreePillars />
      <TraderDnaSection />
      <ShowcaseSection />
      <Features />
      <HowItWorks />
      <VelquorSection />
      <PropFirmSection />
      <TrustSection />
      <Pricing />
      <FAQ />
      <FinalCTA />
      {/* FAQ rich-result structured data (EN — matches default crawl locale) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: getTranslations('en').faq.items.map(i => ({
              '@type': 'Question',
              name: i.q,
              acceptedAnswer: { '@type': 'Answer', text: i.a },
            })),
          }),
        }}
      />
      <FooterTagline />
      <Footer />
    </div>
  )
}
