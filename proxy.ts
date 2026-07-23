import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isRoot = pathname === '/'

  const isPublic =
    isRoot ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
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
    pathname.startsWith('/api/macro')

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
    '/((?!_next/static|_next/image|favicon.ico|login).*)',
  ],
}
