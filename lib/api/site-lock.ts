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

/**
 * Which beta code opened the curtain, if it was a code rather than the shared
 * password. Two jobs: it lets the proxy verify the access token without a
 * database read, and it tells the signup path which invite to credit.
 */
export const BETA_CODE_COOKIE = '__beta'

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

/**
 * The same idea for a personal beta code. Minting requires SITE_PASSWORD, so a
 * holder cannot forge a token for a code they were never given, and the proxy
 * can verify one against the code cookie with no database read.
 *
 * The trade this makes: revoking a code cannot reach into a browser that is
 * already holding a valid cookie. Revocation is enforced where it actually
 * matters instead — the code can no longer be redeemed, and revoking bans the
 * account that claimed it, which every API route already checks. Someone
 * revoked keeps a view of the marketing site and loses the product.
 */
export function betaCodeToken(code: string): string {
  const pw = siteLockPassword() ?? ''
  return createHash('sha256').update(`velquor-gate-code:${normalizeBetaCode(code)}:${pw}`).digest('hex')
}

/** Codes are dictated over the phone, so compare them forgivingly. */
export function normalizeBetaCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function isValidSiteToken(token: string | undefined, betaCode?: string): boolean {
  const pw = siteLockPassword()
  if (!pw) return true          // gate disabled → everything passes
  if (!token) return false
  // Same length by construction (both hex sha256), so a plain compare is fine
  // here; the digest is not a credential an attacker can grind offline.
  if (token === siteLockToken(pw)) return true
  return !!betaCode && token === betaCodeToken(betaCode)
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
    // Not covered by /icon above — Next serves the touch icon at its own path.
    pathname.startsWith('/apple-icon') ||
    // The logo. Two reasons it cannot be gated, and the second is the sharp one:
    //  · the gate page renders the mark, so gating it breaks the one page whose
    //    whole job is to be reachable — it drew a broken-image glyph.
    //  · the confirmation email points at /brand/vq-logo-192.png. An <img> that
    //    302s to an HTML login page renders as nothing in a mail client, so
    //    every beta invite would have arrived logoless — the exact failure the
    //    hosted URL replaced a data: URI to avoid.
    pathname.startsWith('/brand') ||
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
