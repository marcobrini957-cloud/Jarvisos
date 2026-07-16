import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthUserId } from '@/lib/api/auth'
import { getUserPlan } from '@/lib/api/tier'
import { computeStats } from '@/lib/trading/stats'
import { computeBreakdowns } from '@/lib/trading/breakdowns'
import { buildFacts, streamCoachNotes } from '@/lib/ai/coach'
import type { Trade } from '@/types'

export const maxDuration = 60

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// Coach's Notes — AI narration over the deterministic stats/breakdowns.
// The stats themselves (returned by GET) are free for every tier; the AI
// narration (POST) is gated to plans with aiCoaching.
export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await service()
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('close_time', { ascending: false })
    .limit(1000)

  const rows = (data ?? []) as Trade[]
  const plan = await getUserPlan(userId)
  return NextResponse.json({
    tier:       plan.tier,
    aiCoaching: plan.aiCoaching,
    stats:      computeStats(rows),
    breakdowns: computeBreakdowns(rows),
  })
}

export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan = await getUserPlan(userId)
  if (!plan.aiCoaching) {
    return NextResponse.json(
      { error: 'AI Coach\'s Notes are a Pro feature. Your stats are available on the free plan.' },
      { status: 403 },
    )
  }

  const { data } = await service()
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('close_time', { ascending: false })
    .limit(1000)

  const rows = (data ?? []) as Trade[]
  if (rows.filter(r => r.net_profit !== null).length < 5) {
    return NextResponse.json({ error: 'Need at least 5 closed trades for coaching.' }, { status: 400 })
  }

  // Optional trader self-report passed from the client (mood/goals notes).
  const body = await req.json().catch(() => ({}))
  const extra = typeof body?.context === 'string' ? body.context.slice(0, 2000) : ''

  const facts  = buildFacts(computeStats(rows), computeBreakdowns(rows))
  const stream = await streamCoachNotes(plan, facts, extra)

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
