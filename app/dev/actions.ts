'use server'
import { cookies } from 'next/headers'

export async function verifyDevPassword(password: string): Promise<boolean> {
  const secret = process.env.DEV_SECRET
  if (!secret || !password || password !== secret) return false
  const jar = await cookies()
  jar.set('__dev_session', secret, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })
  return true
}

export async function devLogout() {
  const jar = await cookies()
  jar.delete('__dev_session')
}
