import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function buildContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Last 30 days of trades
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: trades } = await supabase
    .from('trades')
    .select('symbol,trade_type,net_profit,pips,session,setup_type,tags,emotion_pre,followed_plan,open_time,close_time')
    .eq('status', 'closed')
    .gte('close_time', since)
    .order('close_time', { ascending: false })
    .limit(100)

  const { data: journal } = await supabase
    .from('journal_entries')
    .select('entry_date,mood,energy_level,body_text,tags,is_trading_day')
    .order('entry_date', { ascending: false })
    .limit(10)

  const { data: snapshot } = await supabase
    .from('account_snapshots')
    .select('balance,equity,daily_pnl,weekly_pnl,monthly_pnl')
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .single()

  const { data: holdings } = await supabase
    .from('portfolio_holdings')
    .select('ticker,name,quantity,avg_buy_price,currency,sector')
    .eq('is_active', true)

  // Compute stats
  const t = (trades ?? [])
  const wins     = t.filter(x => (x.net_profit ?? 0) > 0)
  const losses   = t.filter(x => (x.net_profit ?? 0) < 0)
  const winRate  = t.length > 0 ? (wins.length / t.length * 100).toFixed(1) : '0'
  const totalPnl = t.reduce((s, x) => s + (x.net_profit ?? 0), 0).toFixed(2)
  const avgWin   = wins.length  > 0 ? (wins.reduce((s,x)=>s+(x.net_profit??0),0)/wins.length).toFixed(2)  : '0'
  const avgLoss  = losses.length > 0 ? (losses.reduce((s,x)=>s+(x.net_profit??0),0)/losses.length).toFixed(2) : '0'

  // Tag breakdown
  const tagMap = new Map<string, { w: number; t: number }>()
  for (const tr of t) {
    for (const tag of tr.tags ?? []) {
      const s = tagMap.get(tag) ?? { w: 0, t: 0 }
      s.t++
      if ((tr.net_profit ?? 0) > 0) s.w++
      tagMap.set(tag, s)
    }
  }
  const tagSummary = Array.from(tagMap.entries())
    .map(([tag, s]) => `${tag}: ${(s.w/s.t*100).toFixed(0)}% WR (${s.t} trades)`)
    .join(', ')

  // Session breakdown
  const sessionMap = new Map<string, { w: number; t: number }>()
  for (const tr of t) {
    const s = tr.session ?? 'unknown'
    const cur = sessionMap.get(s) ?? { w: 0, t: 0 }
    cur.t++
    if ((tr.net_profit ?? 0) > 0) cur.w++
    sessionMap.set(s, cur)
  }
  const sessionSummary = Array.from(sessionMap.entries())
    .map(([s, v]) => `${s}: ${(v.w/v.t*100).toFixed(0)}% WR (${v.t} trades)`)
    .join(', ')

  // Emotion breakdown
  const emoMap = new Map<string, { pnl: number; t: number }>()
  for (const tr of t) {
    if (!tr.emotion_pre) continue
    const cur = emoMap.get(tr.emotion_pre) ?? { pnl: 0, t: 0 }
    cur.pnl += tr.net_profit ?? 0
    cur.t++
    emoMap.set(tr.emotion_pre, cur)
  }
  const emotionSummary = Array.from(emoMap.entries())
    .map(([e, v]) => `${e}: avg €${(v.pnl/v.t).toFixed(2)} (${v.t} trades)`)
    .join(', ')

  const recentTrades = t.slice(0, 10).map(tr =>
    `[${tr.symbol} ${tr.trade_type?.toUpperCase()} | ${tr.session ?? '?'} | ${tr.setup_type ?? 'no tag'} | ${(tr.net_profit ?? 0) >= 0 ? '+' : ''}€${(tr.net_profit ?? 0).toFixed(2)}]`
  ).join('\n')

  const journalSummary = (journal ?? []).map(j =>
    `${j.entry_date}: mood=${j.mood ?? '?'}, energy=${j.energy_level ?? '?'}/10, trading=${j.is_trading_day ? 'yes' : 'no'}`
    + (j.body_text ? ` — "${j.body_text.slice(0, 100)}"` : '')
  ).join('\n')

  const portfolioSummary = (holdings ?? []).map(h =>
    `${h.ticker} (${h.currency}): ${h.quantity} shares @ ${h.currency === 'EUR' ? '€' : '$'}${h.avg_buy_price}`
  ).join(', ')

  const acct = snapshot
    ? `Balance: €${snapshot.balance} | Equity: €${snapshot.equity} | Daily P&L: €${snapshot.daily_pnl} | Weekly P&L: €${snapshot.weekly_pnl} | Monthly P&L: €${snapshot.monthly_pnl}`
    : 'No account snapshot available'

  return `
=== MARCO'S TRADING CONTEXT (Live from Supabase) ===

ACCOUNT: ${acct}

LAST 30 DAYS — ${t.length} trades:
Win Rate: ${winRate}% | Total P&L: €${totalPnl} | Avg Win: €${avgWin} | Avg Loss: €${avgLoss}
By Session: ${sessionSummary || 'no data'}
By Setup/Tag: ${tagSummary || 'no tags yet'}
By Emotion: ${emotionSummary || 'no emotion data'}

RECENT TRADES (last 10):
${recentTrades || 'none'}

JOURNAL (last 10 entries):
${journalSummary || 'no entries'}

PORTFOLIO (Trade Republic):
${portfolioSummary || 'no holdings'}
`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()
    if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

    const supabase  = await createClient()
    const context   = await buildContext(supabase)

    const systemPrompt = `You are Jarvis, Marco's personal AI trading assistant.

${context}

ABOUT MARCO:
- Vienna-based Forex day trader
- Trades XAUUSD (Gold) and NAS100 on MetaTrader 5 via Blueberry Markets
- Account currency: EUR
- Long-term portfolio on Trade Republic (stocks + ETFs)
- Goal: become a better, more disciplined, and more profitable trader

YOUR JOB:
- Be direct and data-driven. Always reference actual numbers from his data.
- Identify specific patterns in his trades (time, emotion, session, setup).
- Give actionable recommendations, not generic advice.
- If asked about portfolio or macro, use the data above.
- Keep responses concise but insightful. Use bullet points for patterns.
- If the data shows something concerning (e.g. trading angry, overtrading), call it out directly.`

    // Build messages for Claude
    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-10), // keep last 10 turns for context
      { role: 'user', content: message },
    ]

    // Stream the response
    const stream = await anthropic.messages.stream({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system:     systemPrompt,
      messages,
    })

    const encoder   = new TextEncoder()
    const readable  = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type':  'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[jarvis/chat]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
