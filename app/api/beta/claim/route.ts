import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthUser } from '@/lib/api/auth'
import { BETA_CODE_COOKIE } from '@/lib/api/site-lock'
import { claimInvite } from '@/lib/beta/invites'

/**
 * Bind the signed-in account to the beta code its browser came in on.
 *
 * Called from two places on purpose — the auth callback, and the dashboard on
 * first load. There is no single hook that catches every route in: email
 * confirmation lands on the callback, a password sign-in never touches it, and
 * Google login is a client transition. `claimInvite` is idempotent, so the
 * cheapest correct answer is to try from both ends.
 */
export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jar = await cookies()
  const code = jar.get(BETA_CODE_COOKIE)?.value
  if (!code) return NextResponse.json({ claimed: false, reason: 'no code' })

  const result = await claimInvite(user.id, user.email ?? null, code)
  return NextResponse.json(result)
}
