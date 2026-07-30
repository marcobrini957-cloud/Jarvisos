import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SITE_LOCK_COOKIE, isSiteLocked, isSiteLockExempt, isValidSiteToken } from '@/lib/api/site-lock'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Site lockdown ───────────────────────────────────────────────────────────
  // Sits in front of everything, including the marketing site and user login,
  // so the product is not visible to anyone who finds the domain while it is
  // still being built. Off entirely unless SITE_PASSWORD is set.
  if (isSiteLocked() && !isSiteLockExempt(pathname)) {
    if (!isValidSiteToken(request.cookies.get(SITE_LOCK_COOKIE)?.value)) {
      // An API caller gets JSON; only a browser gets sent to the gate, and it
      // remembers where it was going.
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Site is locked' }, { status: 401 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/gate'
      url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`
      return NextResponse.redirect(url)
    }
  }

  const isRoot = pathname === '/'

  const isPublic =
    isRoot ||
    pathname.startsWith('/login') ||
    pathname === '/gate' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    // Self-hosted faces must reach signed-out visitors too, or the landing and
    // login pages render in the fallback font.
    pathname.startsWith('/fonts') ||
    // Partner logos appear in the free-user ad rail, which renders before the
    // session is resolved on a cold load.
    pathname.startsWith('/partners') ||
    // The link-preview card. Discord, Slack and X fetch it signed-out, so
    // without this it 307s to /login and every shared link unfurls blank.
    pathname === '/og.png' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/ea') ||
    pathname.startsWith('/brand') ||
    pathname.startsWith('/trailer') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/impressum') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/datenschutz') ||
    pathname.startsWith('/agb') ||
    pathname.startsWith('/dev') ||
    pathname.startsWith('/api/dev') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/market') ||
    pathname.startsWith('/api/macro') ||
    pathname.startsWith('/api/go')     // outbound affiliate redirect — never gate a click behind login

  // Public paths (except the landing root) need no session lookup.
  if (isPublic && !isRoot) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Landing page: send already-signed-in users straight to the app.
  // Signed-out visitors still get the marketing site.
  if (isRoot) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return response
  }

  if (!user) {
    // API callers get a proper 401 instead of an HTML login redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // `login` used to be excluded here, which meant the proxy never ran for it
    // — so the site lock did not cover the one page an outsider would try.
    // It is safe to include: /login is in `isPublic`, so it short-circuits
    // before the auth redirect and cannot loop.
    //
    // `_vercel` is excluded because the platform serves it, not us:
    // /_vercel/insights/script.js and its event beacon were being 307'd to
    // /gate (and, once the lock is lifted, to /login), so web analytics would
    // have silently collected nothing from exactly the signed-out visitors it
    // exists to measure.
    '/((?!_next/static|_next/image|_vercel|favicon.ico).*)',
  ],
}
