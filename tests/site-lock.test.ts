import { describe, it, expect } from 'vitest'
import { isSiteLockExempt } from '@/lib/api/site-lock'

// The gate redirects everything it does not exempt to an HTML page. That is the
// right answer for a product route and the wrong one for an <img> src, and the
// difference is invisible until someone opens an email. These pin the paths
// that must keep answering with bytes while the site is locked.

describe('isSiteLockExempt', () => {
  it('lets the gate itself and its API through, or there is no way in', () => {
    expect(isSiteLockExempt('/gate')).toBe(true)
    expect(isSiteLockExempt('/api/gate')).toBe(true)
  })

  it('exempts the brand assets', () => {
    // Gating these broke two things at once: the gate page drew a broken-image
    // glyph where its own logo goes, and the confirmation email's <img> pointed
    // at a 302 to a login page — which renders as nothing in a mail client.
    for (const size of [64, 128, 192, 512]) {
      expect(isSiteLockExempt(`/brand/vq-logo-${size}.png`)).toBe(true)
      expect(isSiteLockExempt(`/brand/vq-mark-${size}.png`)).toBe(true)
    }
  })

  it('exempts every icon a browser or phone asks for unprompted', () => {
    expect(isSiteLockExempt('/favicon.ico')).toBe(true)
    expect(isSiteLockExempt('/icon.png')).toBe(true)
    // startsWith('/icon') does NOT catch this one — it needs its own clause.
    expect(isSiteLockExempt('/apple-icon.png')).toBe(true)
    expect(isSiteLockExempt('/manifest.webmanifest')).toBe(true)
  })

  it('exempts what machines fetch signed-out: previews, crawlers, cron', () => {
    expect(isSiteLockExempt('/og.png')).toBe(true)
    expect(isSiteLockExempt('/robots.txt')).toBe(true)
    expect(isSiteLockExempt('/api/cron/sync')).toBe(true)
  })

  it('still gates the product and the marketing site', () => {
    // The whole point of the lock. If any of these ever come back true the
    // gate is decorative.
    for (const p of ['/', '/dashboard', '/login', '/pricing', '/api/trades']) {
      expect(isSiteLockExempt(p)).toBe(false)
    }
  })
})
