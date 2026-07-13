import { Nav } from '@/components/landing/Nav'
import { Hero } from '@/components/landing/Hero'
import { ThreePillars } from '@/components/landing/ThreePillars'
import { StatsBar } from '@/components/landing/StatsBar'
import { ShowcaseSection } from '@/components/landing/ShowcaseSection'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { VelquorSection } from '@/components/landing/VelquorSection'
import { PropFirmSection } from '@/components/landing/PropFirmSection'
import { Pricing } from '@/components/landing/Pricing'
import { FooterTagline } from '@/components/landing/FooterTagline'
import { Footer } from '@/components/landing/Footer'
import { ScrollSetup } from '@/components/landing/ScrollSetup'

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--t1)', overflowX: 'hidden' }}>
      <ScrollSetup />
      <Nav />
      <Hero />
      <ThreePillars />
      <StatsBar />
      <ShowcaseSection />
      <Features />
      <HowItWorks />
      <VelquorSection />
      <PropFirmSection />
      <Pricing />
      <FooterTagline />
      <Footer />
    </div>
  )
}
