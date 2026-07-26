'use client'

import type { AnchorHTMLAttributes, ReactNode } from 'react'
import type { Partner } from '@/lib/partners'

/**
 * An affiliate link that behaves like a plain link.
 *
 * It used to point at /api/go/[id], which looked up the session, checked the
 * ban list and awaited a `partner_clicks` insert *before* issuing the redirect —
 * three serial round trips plus a possible cold start. The new tab sat there
 * blank and titled "Untitled" for a second or more, which reads as a scam page
 * at exactly the moment we are asking someone to trust a broker.
 *
 * So the href is now the partner's real URL: the browser goes straight there,
 * same as clicking the referral link directly. The click is recorded with
 * `navigator.sendBeacon`, which the browser sends in the background and does not
 * make anybody wait for. If the beacon is blocked we lose a count — the correct
 * trade, since the alternative was making every user wait to be counted.
 *
 * /api/go/[id] still exists and still works (it is what an ad or an email would
 * use, where no JS runs), and it now redirects first and logs afterwards too.
 */
export default function PartnerLink({
  partner, slot, children, ...rest
}: {
  partner:  Partner
  /** Where the click came from — 'tab' | 'rail' | 'ad' | 'brief' | … */
  slot:     string
  children: ReactNode
  /** Anything else an <a> takes — the cards hover-style themselves. */
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'onClick'>) {
  function record() {
    try {
      const body = JSON.stringify({ partnerId: partner.id, slot })
      // sendBeacon is queued by the browser and survives this tab losing focus.
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/click', new Blob([body], { type: 'application/json' }))
      } else {
        // keepalive lets the request outlive the page in browsers without beacon
        fetch('/api/click', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } })
          .catch(() => {})
      }
    } catch {
      // never let logging interfere with the click
    }
  }

  return (
    <a
      href={partner.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={record}
      onAuxClick={record}     // middle-click opens in a tab too
      {...rest}
    >
      {children}
    </a>
  )
}
