'use server'
import { cookies, headers } from 'next/headers'
import { timingSafeEqual } from 'crypto'
import { rateLimit } from '@/lib/api/rate-limit'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export async function verifyDevPassword(password: string): Promise<boolean> {
  const secret = process.env.DEV_SECRET
  if (!secret || !password) return false

  // Brute-force protection: 5 attempts/min per IP + constant-time compare + failure delay
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!rateLimit(`dev-login:${ip}`, 5, 60_000)) return false

  if (!safeEqual(password, secret)) {
    await new Promise(r => setTimeout(r, 750))
    return false
  }

  const jar = await cookies()
  jar.set('__dev_session', secret, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })
  return true
}

export async function devLogout() {
  const jar = await cookies()
  jar.delete('__dev_session')
}
