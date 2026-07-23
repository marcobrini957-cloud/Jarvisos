import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/api/auth'

// Daily net-worth points (one per day = last snapshot of that day, via the
// account_networth_daily RPC so a high-frequency account isn't truncated by the
// 1000-row REST cap). Accepts either ?year=YYYY (Jan 1 → Jan 1 next year) or the
// legacy ?days=N rolling window.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')

  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let from: string, to: string
  if (yearParam && /^\d{4}$/.test(yearParam)) {
    const y = parseInt(yearParam, 10)
    from = `${y}-01-01T00:00:00Z`
    to   = `${y + 1}-01-01T00:00:00Z`
  } else {
    const days = Math.min(parseInt(searchParams.get('days') ?? '90', 10), 366)
    from = new Date(Date.now() - days * 86_400_000).toISOString()
    to   = new Date(Date.now() + 86_400_000).toISOString()
  }

  const { data, error } = await supabase.rpc('account_networth_daily', {
    p_user_id: user.id, p_from: from, p_to: to,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const points = (data ?? []).map((r: { day: string; balance: number; equity: number }) => ({
    date: r.day, balance: Number(r.balance), equity: Number(r.equity),
  }))

  return NextResponse.json({ points })
}
