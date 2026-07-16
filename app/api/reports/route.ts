import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer }            from '@react-pdf/renderer'
import { createElement }             from 'react'
import { createClient }              from '@/lib/supabase/server'
import { TradingReport }             from '@/lib/pdf/TradingReport'
import type { Trade }                from '@/types'
import { getAuthUser } from '@/lib/api/auth'
import { getUserPlan } from '@/lib/api/tier'
import { computeStats } from '@/lib/trading/stats'
import { computeBreakdowns } from '@/lib/trading/breakdowns'
import { buildFacts, generateCoachNotes } from '@/lib/ai/coach'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = (searchParams.get('period') ?? 'weekly') as 'weekly' | 'monthly'
    const from   = searchParams.get('from') ?? ''
    const to     = searchParams.get('to')   ?? ''

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from / to params (YYYY-MM-DD)' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user for the trader name in the report
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch trades in the date window (closed, real trades only)
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .gte('close_time', `${from}T00:00:00.000Z`)
      .lte('close_time', `${to}T23:59:59.999Z`)
      .order('close_time', { ascending: true })

    if (error) {
      console.error('[reports] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const traderName = user?.email?.split('@')[0] ?? 'Trader'
    const rows       = (trades ?? []) as Trade[]

    // Coach's Notes: AI narration for Pro/Ultra, computed from this period's
    // stats. Free tier omits it (section hidden). Never blocks the report —
    // generateCoachNotes returns '' on any failure.
    let coachNotes = ''
    const plan = await getUserPlan(user.id)
    if (plan.aiCoaching && rows.filter(r => r.net_profit !== null).length >= 5) {
      const facts = buildFacts(computeStats(rows), computeBreakdowns(rows))
      coachNotes  = await generateCoachNotes(plan, facts)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      createElement(TradingReport, {
        trades:      rows,
        from,
        to,
        period,
        traderName,
        coachNotes,
      }) as any
    )

    const filename = `velquor-${period}-${from}.pdf`

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      buffer.byteLength.toString(),
      },
    })
  } catch (err) {
    console.error('[reports] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
