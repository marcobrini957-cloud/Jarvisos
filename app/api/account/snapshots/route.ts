import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/api/auth'

// Returns daily equity curve data (last snapshot per day, last 90 days)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '90', 10), 365)

  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('account_snapshots')
    .select('balance, equity, snapshot_at')
    .eq('user_id', user.id)
    .gte('snapshot_at', since)
    .order('snapshot_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ points: [] })

  // Keep one point per day (last of day)
  const byDay = new Map<string, { date: string; balance: number; equity: number }>()
  for (const row of data) {
    const d = row.snapshot_at.slice(0, 10)
    byDay.set(d, { date: d, balance: row.balance, equity: row.equity })
  }

  const points = Array.from(byDay.values())
  return NextResponse.json({ points })
}
