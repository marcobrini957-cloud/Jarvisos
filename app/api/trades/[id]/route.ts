import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserId } from '@/lib/api/auth'

// PATCH /api/trades/:id  — update trade annotation fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    // Only allow annotation-safe fields
    const allowed = [
      'setup_type', 'trade_rationale', 'emotion_pre',
      'followed_plan', 'discipline_score', 'notes',
      'tags', 'timeframe', 'indicators_used',
      'screenshot_open_url', 'screenshot_close_url', 'screenshot_user_url', 'screenshot_missing',
    ]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }
    updates.updated_at = new Date().toISOString()

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ trade: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
