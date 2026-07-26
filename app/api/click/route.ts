import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/api/auth'
import { getPartner } from '@/lib/partners'

// Affiliate click beacon.
//
// Counterpart to components/dashboard/PartnerLink: the link itself points
// straight at the partner, and the click arrives here separately via
// navigator.sendBeacon. Nobody is waiting on this response, so it can afford the
// session lookup that /api/go could not.
//
// Best-effort by design — a failure here must lose a statistic, never a click.
export async function POST(req: Request) {
  try {
    const { partnerId, slot } = await req.json() as { partnerId?: string; slot?: string }
    const partner = partnerId ? getPartner(partnerId) : undefined
    if (!partner) return new NextResponse(null, { status: 204 })

    const user = await getAuthUser()
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    await sb.from('partner_clicks').insert({
      partner_id: partner.id,
      user_id:    user?.id ?? null,
      slot:       slot?.slice(0, 16) ?? null,
      referer:    req.headers.get('referer')?.slice(0, 512) ?? null,
    })
  } catch {
    // swallow — the click already happened
  }
  return new NextResponse(null, { status: 204 })
}
