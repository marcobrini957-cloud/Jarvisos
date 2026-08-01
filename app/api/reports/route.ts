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
import { zonedRangeToUtc } from '@/lib/dates'

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

    // The window is a run of calendar days in the trader's own timezone, not in
    // UTC. Naive `Z` bounds put a trade closed at 00:30 on 1 July in Vienna —
    // 22:30 on 30 June UTC — into the previous month's report.
    const { data: prof } = await supabase
      .from('user_profiles').select('timezone').eq('id', user.id).maybeSingle()
    const tz = prof?.timezone || 'UTC'
    const { startUtc, endUtc } = zonedRangeToUtc(from, to, tz)

    // Fetch trades in the date window (closed, real trades only)
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .gte('close_time', startUtc)
      .lte('close_time', endUtc)
      .order('close_time', { ascending: true })

    if (error) {
      console.error('[reports] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (trades ?? []) as Trade[]

    // The account the report covers. Prefer a login seen in this window, so a
    // trader with more than one account gets the right number on the right
    // report; fall back to the latest snapshot when the window is empty.
    let account = rows.find(r => r.mt5_login)?.mt5_login?.toString() ?? ''
    if (!account) {
      const { data: snap } = await supabase
        .from('account_snapshots')
        .select('mt5_login')
        .eq('user_id', user.id)
        .not('mt5_login', 'is', null)
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      account = snap?.mt5_login?.toString() ?? ''
    }

    // Coach's Notes: AI narration for Pro/Ultra, computed from this period's
    // stats. Free tier omits it (section hidden). Never blocks the report —
    // generateCoachNotes returns '' on any failure.
    let coachNotes = ''
    const plan = await getUserPlan(user.id)
    // Only the AI notes section was gated; the report itself was not, so a
    // free account could download the whole thing the page says it cannot.
    if (!plan.can.pdfReports) {
      return NextResponse.json(
        { error: 'PDF reports are part of Pro.', code: 'tier_required', requires: 'pro' },
        { status: 403 },
      )
    }
    if (plan.aiCoaching && rows.filter(r => r.net_profit !== null).length >= 5) {
      const facts = buildFacts(computeStats(rows), computeBreakdowns(rows))
      coachNotes  = await generateCoachNotes(plan, facts)
    }

    const buffer = await renderToBuffer(
      createElement(TradingReport, {
        trades:      rows,
        from,
        to,
        period,
        account,
        coachNotes,
        // renderToBuffer's parameter type is @react-pdf's own DocumentElement,
        // which createElement cannot be narrowed to from a plain component.
      }) as unknown as Parameters<typeof renderToBuffer>[0]
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
