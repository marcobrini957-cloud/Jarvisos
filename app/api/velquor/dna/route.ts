import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthUserId } from '@/lib/api/auth'
import { getUserPlan } from '@/lib/api/tier'
import { computeTraderDna } from '@/lib/trading/traderDna'
import { generateDnaFocus } from '@/lib/ai/coach'
import type { Trade } from '@/types'

export const maxDuration = 60

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// Trader DNA. Scores (deterministic) are returned for every tier; the AI focus
// paragraph is generated for tiers with aiCoaching, when there's enough data.
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
  const dna  = computeTraderDna(rows)
  const plan = await getUserPlan(userId)

  let focus = ''
  if (plan.aiCoaching && dna.sampleSize >= 10) {
    focus = await generateDnaFocus(plan, dna)
  }

  return NextResponse.json({
    tier:       plan.tier,
    aiCoaching: plan.aiCoaching,
    dna,
    focus,
    ready:      dna.sampleSize >= 10,
  })
}
