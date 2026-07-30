'use client'

import { useSyncExternalStore } from 'react'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { getCookieConsent, onConsentChange } from '@/components/CookieConsent'

/**
 * Page views and CTA events — gated on consent.
 *
 * The landing page carried eight signup buttons and no instrumentation of any
 * kind, so there was no way to tell whether people leave at the hero, at the
 * pricing table or at the email-confirmation wall. Every opinion about the
 * funnel was a guess.
 *
 * Vercel Web Analytics was chosen over Plausible/PostHog for one reason that
 * matters here: it sets no cookies and stores nothing on the visitor's device,
 * so it does not widen the consent surface this site already manages. It is
 * still gated on an explicit "Accept" — a visitor who picks "Essential only" is
 * telling us not to measure them, and honouring only the letter of that (no
 * cookies were set anyway) would be missing the point.
 *
 * Swapping providers is a change to this file plus lib/analytics.ts: no call
 * site touches a vendor API.
 */

// Consent lives in localStorage and announces itself on a custom event — an
// external store, which is what useSyncExternalStore is for. Reading it in an
// effect and calling setState would render twice on every mount.
const subscribe = (onChange: () => void) => onConsentChange(() => onChange())
const isAllowed = () => getCookieConsent() === 'all'
const onServer  = () => false

export function Analytics() {
  const allowed = useSyncExternalStore(subscribe, isAllowed, onServer)
  return allowed ? <VercelAnalytics /> : null
}
