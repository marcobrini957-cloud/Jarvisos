import type { Metadata } from 'next'
import { HeroV2 } from '@/components/landing/v2/HeroV2'

/**
 * Preview route for the second landing direction.
 *
 * The live landing is hand-tuned, so this sits beside it rather than replacing
 * it — Marco looks at /preview/landing, and only then do we swap. Kept out of
 * search results: it is a work in progress, not a second front door.
 */
export const metadata: Metadata = {
  title: 'VELQUOR — landing preview',
  robots: { index: false, follow: false },
}

export default function LandingPreviewPage() {
  return (
    <div className="landing-root vq2" style={{ background: '#05070a', color: '#fff' }}>
      <HeroV2 />
    </div>
  )
}
