import { track } from '@vercel/analytics'

/**
 * The product's own event vocabulary, so call sites never touch a vendor API.
 *
 * `track()` is a no-op when the `<Analytics/>` component is not mounted, which
 * is exactly what happens when a visitor chose "Essential only" — so consent is
 * enforced in one place (components/Analytics.tsx) rather than at every call.
 */
export type VqEvent =
  /** A signup / pricing call-to-action was clicked. `where` names the section. */
  | { name: 'cta_click'; where: string }
  /** The monthly ↔ annual switch. Which one people land on is a pricing signal. */
  | { name: 'billing_toggle'; period: 'monthly' | 'annual' }

export function trackEvent(e: VqEvent) {
  const { name, ...props } = e
  track(name, props)
}
