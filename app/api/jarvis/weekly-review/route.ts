import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { wins, losses, lessons, goals, mood, energy, week } = await req.json()

    const supabase = await createClient()
    const since    = new Date(week + 'T00:00:00').toISOString()
    const until    = new Date(new Date(week + 'T00:00:00').getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Pull week's trades
    const { data: trades } = await supabase
      .from('trades')
      .select('symbol,trade_type,net_profit,pips,session,setup_type,tags,emotion_pre,followed_plan')
      .eq('status', 'closed')
      .gte('close_time', since)
      .lte('close_time', until)

    const t = trades ?? []
    const totalPnl   = t.reduce((s, x) => s + (x.net_profit ?? 0), 0)
    const winRate    = t.length > 0 ? (t.filter(x => (x.net_profit ?? 0) > 0).length / t.length * 100).toFixed(1) : '0'
    const tradeCount = t.length

    // Pull week's journal entries
    const { data: journal } = await supabase
      .from('journal_entries')
      .select('entry_date,mood,energy_level,body_text,is_trading_day')
      .gte('entry_date', week)
      .lte('entry_date', new Date(new Date(week + 'T00:00:00').getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('entry_date', { ascending: true })

    const journalSummary = (journal ?? []).map(j =>
      `${j.entry_date}: mood=${j.mood ?? '?'}, energy=${j.energy_level ?? '?'}/10` + (j.body_text ? ` — "${j.body_text.slice(0, 80)}"` : '')
    ).join('\n')

    const prompt = `You are Jarvis, Marco's AI trading analyst. Analyze his week and provide a deep, personalized review.

WEEK: ${week}
MARCO'S SELF-REPORT:
- Overall mood: ${mood || 'not specified'}
- Energy: ${energy}/10
- Wins: ${wins || 'not filled in'}
- What didn't work: ${losses || 'not filled in'}
- Lessons: ${lessons || 'not filled in'}
- Goals next week: ${goals || 'not filled in'}

THIS WEEK'S TRADING DATA:
- Trades taken: ${tradeCount}
- Win rate: ${winRate}%
- Total P&L: €${totalPnl.toFixed(2)}
${t.length > 0 ? `- Trades: ${t.map(x => `${x.symbol} ${x.trade_type?.toUpperCase()} €${(x.net_profit ?? 0).toFixed(2)} [${x.session ?? '?'}]`).join(', ')}` : '- No trades this week'}

JOURNAL ENTRIES THIS WEEK:
${journalSummary || 'No journal entries'}

Write a comprehensive weekly review analysis (3-5 paragraphs). Be specific, reference actual numbers.
Include:
1. Trading performance assessment — what the numbers say
2. Patterns you notice between mood/energy and performance
3. Whether his self-assessment matches the data
4. 2-3 specific, actionable improvements for next week
5. A motivating but honest closing

Be direct. Don't sugarcoat. This is for someone who wants to become a better trader.`

    const stream = await anthropic.messages.stream({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages:   [{ role: 'user', content: prompt }],
    })

    const encoder  = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    console.error('[jarvis/weekly-review]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
