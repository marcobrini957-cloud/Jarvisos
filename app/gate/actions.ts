'use server'

import { cookies, headers } from 'next/headers'
import { timingSafeEqual } from 'crypto'
import { rateLimit } from '@/lib/api/rate-limit'
import { SITE_LOCK_COOKIE, siteLockPassword, siteLockToken } from '@/lib/api/site-lock'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** Same posture as the /dev login: rate-limited, constant-time, slow on failure. */
export async function unlockSite(password: string): Promise<boolean> {
  const secret = siteLockPassword()
  if (!secret || !password) return false

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!rateLimit(`site-gate:${ip}`, 8, 60_000)) return false

  if (!safeEqual(password, secret)) {
    await new Promise(r => setTimeout(r, 600))
    return false
  }

  const jar = await cookies()
  jar.set(SITE_LOCK_COOKIE, siteLockToken(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days — this is a curtain, not a login
    path: '/',
  })
  return true
}
