import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BETA_CODE_COOKIE } from '@/lib/api/site-lock'
import { claimInvite } from '@/lib/beta/invites'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}`)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()              { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      // If this browser came in on a beta invite, settle the plan before the
      // dashboard renders — otherwise the tester's first screen is the free
      // tier and every paid panel is locked behind an upgrade prompt.
      const betaCode = cookieStore.get(BETA_CODE_COOKIE)?.value
      if (betaCode && data.user) {
        try {
          await claimInvite(data.user.id, data.user.email ?? null, betaCode)
        } catch {
          // The dashboard retries this on mount; never strand a confirmed
          // signup on the login page over a grant that can be redone.
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
