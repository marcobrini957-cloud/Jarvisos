import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer }            from '@react-pdf/renderer'
import { createElement }             from 'react'
import { createClient }              from '@/lib/supabase/server'
import { TradingReport }             from '@/lib/pdf/TradingReport'
import type { Trade }                from '@/types'

export const dynamic = 'force-dynamic'

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
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch trades in the date window (closed, real trades only)
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'closed')
      .gte('close_time', `${from}T00:00:00.000Z`)
      .lte('close_time', `${to}T23:59:59.999Z`)
      .order('close_time', { ascending: true })

    if (error) {
      console.error('[reports] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const traderName = user?.email?.split('@')[0] ?? 'Trader'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      createElement(TradingReport, {
        trades:      (trades ?? []) as Trade[],
        from,
        to,
        period,
        traderName,
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
