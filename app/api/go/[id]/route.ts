import { NextResponse, after } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/api/auth'
import { getPartner } from '@/lib/partners'

// Outbound affiliate redirect + click logger.
//   GET /api/go/[id]?slot=tab
//
// The in-product links no longer come through here — they point straight at the
// partner and beacon the click to /api/click, because this route used to await a
// session lookup, a ban check and an insert *before* redirecting, and the new tab
// sat blank ("Untitled") for the duration.
//
// It stays for the cases where no JS runs: an email, an ad network's click macro,
// a bookmarked link. The fix is the same either way — redirect on the first tick
// and log in `after()`, which Next runs once the response is on the wire.
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

  const slot    = new URL(req.url).searchParams.get('slot')?.slice(0, 16) ?? null
  const referer = req.headers.get('referer')?.slice(0, 512) ?? null

  after(async () => {
    try {
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
        referer,
      })
    } catch {
      // swallow — the click just won't be counted
    }
  })

  return NextResponse.redirect(partner.url, { status: 302 })
}
