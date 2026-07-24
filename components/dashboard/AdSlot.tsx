'use client'

import { useEffect, useRef, useState } from 'react'
import { useUserProfile } from '@/context/UserProfileContext'
import { getCookieConsent, onConsentChange } from '@/components/CookieConsent'
import { pickHousePartner } from '@/lib/partners'
import PartnerCard from './PartnerCard'

// Env seam for a real ad network. Set NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…)
// and NEXT_PUBLIC_ADSENSE_SLOT to switch a slot from house ads to network fill.
// Until then every free-user slot renders a house/affiliate promo.
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const ADSENSE_SLOT   = process.env.NEXT_PUBLIC_ADSENSE_SLOT

// A tier-gated ad slot.
//   free  → network ad (if configured + consented) else a house affiliate promo
//   paid  → nothing, or a subtle "ad-free" nudge when `showPaidNote`
export default function AdSlot({
  seed = 0,
  showPaidNote = false,
}: {
  seed?: number
  showPaidNote?: boolean
}) {
  const { profile, loading } = useUserProfile()

  // Track consent so a network ad can appear the moment the user accepts "all".
  const [consent, setConsent] = useState(() => getCookieConsent())
  useEffect(() => onConsentChange(setConsent), [])

  if (loading) return null

  // Paid users get an ad-free experience (and an optional reinforcement note).
  if (profile.tier !== 'free') {
    if (!showPaidNote) return null
    return (
      <div style={{
        padding: '10px 14px', borderRadius: '12px',
        background: 'var(--s1)', border: '1px solid var(--bd)',
        fontSize: '11px', color: 'var(--t3)', textAlign: 'center',
      }}>
        ✦ Ad-free — thanks for being {profile.tier === 'ultra' ? 'Ultra' : 'Pro'}
      </div>
    )
  }

  // Network fill only with explicit "all" consent (matches the TradingView /
  // third-party posture in the cookie banner). Otherwise: house ad.
  const networkReady = Boolean(ADSENSE_CLIENT && ADSENSE_SLOT) && consent === 'all'
  if (networkReady) return <NetworkAd />

  const house = pickHousePartner(seed)
  if (!house) return null
  return <PartnerCard partner={house} slot="ad" />
}

// AdSense unit. Loads the script once, then registers this slot.
function NetworkAd() {
  const ref = useRef<HTMLModElement>(null)

  useEffect(() => {
    const SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
    if (!document.querySelector(`script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`)) {
      const s = document.createElement('script')
      s.src = SRC
      s.async = true
      s.crossOrigin = 'anonymous'
      document.head.appendChild(s)
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
    } catch { /* not loaded yet — script push retries on its own */ }
  }, [])

  return (
    <ins
      ref={ref}
      className="adsbygoogle"
      style={{ display: 'block', minHeight: '90px' }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={ADSENSE_SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
