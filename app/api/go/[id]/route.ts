import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/api/auth'
import { getPartner } from '@/lib/partners'

// Outbound affiliate redirect + click logger.
//   GET /api/go/[id]?slot=tab
// Looks up the partner, records a best-effort click (never blocking the
// redirect), then 302s to the real affiliate URL. Keeping the affiliate URL
// server-side means the tracking fires reliably and the raw ref code isn't
// baked into every card's markup.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const partner = getPartner(id)

  // Unknown id → send them home rather than erroring out.
  if (!partner) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Best-effort logging. A failure here must never stop the redirect.
  try {
    const url  = new URL(req.url)
    const slot = url.searchParams.get('slot')?.slice(0, 16) ?? null
    const user = await getAuthUser()
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    await sb.from('partner_clicks').insert({
      partner_id: partner.id,
      user_id:    user?.id ?? null,
      slot,
      referer:    req.headers.get('referer')?.slice(0, 512) ?? null,
    })
  } catch {
    // swallow — the click just won't be counted
  }

  return NextResponse.redirect(partner.url)
}
