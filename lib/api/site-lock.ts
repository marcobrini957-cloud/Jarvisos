import { createHash } from 'crypto'

/**
 * Site-wide lockdown.
 *
 * While VELQUOR is still being built, the whole site can be put behind a single
 * shared password so the product is not visible to anyone who happens to find
 * the domain. This is separate from user login — it sits in front of it, and
 * separate from the /dev console, which keeps its own password.
 *
 * Off unless SITE_PASSWORD is set, so a missing env var can never lock anyone
 * out by accident; removing the variable lifts the gate.
 */

export const SITE_LOCK_COOKIE = '__site_access'

export function siteLockPassword(): string | null {
  const pw = process.env.SITE_PASSWORD
  return pw && pw.length > 0 ? pw : null
}

export function isSiteLocked(): boolean {
  return siteLockPassword() !== null
}

/**
 * The cookie holds a digest, never the password itself — a shared secret in
 * plaintext on every visitor's machine is a secret with a short life.
 */
export function siteLockToken(password: string): string {
  return createHash('sha256').update(`velquor-gate:${password}`).digest('hex')
}

export function isValidSiteToken(token: string | undefined): boolean {
  const pw = siteLockPassword()
  if (!pw) return true          // gate disabled → everything passes
  if (!token) return false
  const expected = siteLockToken(pw)
  // Same length by construction (both hex sha256), so a plain compare is fine
  // here; the digest is not a credential an attacker can grind offline.
  return token === expected
}

/**
 * Paths that must answer even while the gate is up:
 *  · the gate itself, or there is no way in
 *  · Next's own assets and the fonts/icons the gate page renders with
 *  · scheduled jobs, which carry their own secret and have no browser to redirect
 *  · /dev, which is the admin console and already has its own password
 */
export function isSiteLockExempt(pathname: string): boolean {
  return (
    pathname === '/gate' ||
    pathname.startsWith('/api/gate') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    // The link-preview card. It is marketing, not product — it shows the
    // wordmark and the headline and nothing behind the gate — and a link
    // shared during the private beta should still unfurl.
    pathname === '/og.png' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/dev') ||
    pathname.startsWith('/api/dev')
  )
}
