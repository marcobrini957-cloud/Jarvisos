'use server'

import { cookies, headers } from 'next/headers'
import { timingSafeEqual } from 'crypto'
import { rateLimit } from '@/lib/api/rate-limit'
import {
  BETA_CODE_COOKIE,
  SITE_LOCK_COOKIE,
  betaCodeToken,
  normalizeBetaCode,
  siteLockPassword,
  siteLockToken,
} from '@/lib/api/site-lock'
import { lookupInvite, markInviteSeen } from '@/lib/beta/invites'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

const THIRTY_DAYS = 60 * 60 * 24 * 30

/**
 * One box, two kinds of key: the shared build password Marco uses, or a beta
 * tester's personal code. Same posture as the /dev login — rate-limited,
 * constant-time on the shared secret, slow on failure.
 */
export async function unlockSite(secretOrCode: string): Promise<boolean> {
  const secret = siteLockPassword()
  const entry  = secretOrCode?.trim()
  if (!secret || !entry) return false

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!rateLimit(`site-gate:${ip}`, 8, 60_000)) return false

  const jar = await cookies()
  const cookieOpts = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: THIRTY_DAYS, // this is a curtain, not a login
    path: '/',
  }

  // The shared password: unchanged behaviour, and it clears any stale code so a
  // browser cannot end up carrying someone else's invite.
  if (entry.length === secret.length && safeEqual(entry, secret)) {
    jar.set(SITE_LOCK_COOKIE, siteLockToken(secret), cookieOpts)
    jar.delete(BETA_CODE_COOKIE)
    return true
  }

  // A personal beta code.
  const code = normalizeBetaCode(entry)
  const invite = await lookupInvite(code)
  if (invite) {
    jar.set(SITE_LOCK_COOKIE, betaCodeToken(code), cookieOpts)
    // Readable by the server on signup so the account lands on the right plan.
    jar.set(BETA_CODE_COOKIE, code, cookieOpts)
    await markInviteSeen(code)
    return true
  }

  await new Promise(r => setTimeout(r, 600))
  return false
}
