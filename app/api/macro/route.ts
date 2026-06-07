import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { fetchFFCalendar, todaysEvents, highImpactForTrading } from '@/lib/forex-factory/calendar'

export const maxDuration = 60

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// GET /api/macro — returns calendar events + latest briefing
export async function GET() {
  try {
    const [supabase, calendarEvents] = await Promise.all([
      createClient(),
      fetchFFCalendar(),
    ])

    // Latest macro briefing
    const { data: briefing } = await supabase
      .from('macro_briefings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      briefing: briefing ?? null,
      calendar: calendarEvents,
      todayHighImpact: highImpactForTrading(todaysEvents(calendarEvents)),
    })
  } catch (err) {
    console.error('[macro GET]', err)
    return NextResponse.json({ error: 'Failed to fetch macro data' }, { status: 500 })
  }
}

// POST /api/macro/briefing — generate a new Jarvis briefing via Claude Haiku
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Fetch context data in parallel
    const [calendarEvents, tradesResult, portfolioResult] = await Promise.all([
      fetchFFCalendar(),
      supabase.from('trades').select('symbol,trade_type,net_profit,session,setup_type,open_time')
        .eq('status', 'closed')
        .gte('open_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('open_time', { ascending: false }),
      supabase.from('portfolio_holdings').select('ticker,name,asset_type,quantity,avg_buy_price').eq('is_active', true),
    ])

    const todayEvents = todaysEvents(calendarEvents)
    const trades      = tradesResult.data ?? []
    const holdings    = portfolioResult.data ?? []

    // Build Haiku prompt — comprehensive NY open briefing
    const systemPrompt = `You are Jarvis, Marco's personal trading intelligence. Marco is a Forex day trader based in Vienna, Austria. He day trades Gold (XAUUSD) and Nasdaq (NAS100) on MetaTrader 5 via Blueberry Markets, and holds NVDA, MSFT, World ETF, and Clean Energy ETF long-term on Trade Republic.

Your job is to deliver the most valuable, specific, data-rich morning briefing possible — covering everything a serious trader needs before the New York session opens. Be direct, be specific, use real numbers where available. No fluff.`

    const userPrompt = `Generate Marco's NY Open Briefing for ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

TODAY'S ECONOMIC CALENDAR:
${todayEvents.length > 0
  ? todayEvents.map(e => `• ${e.time} — ${e.title} (${e.currency}) — Impact: ${e.impact}${e.forecast ? ` — Forecast: ${e.forecast}` : ''}${e.previous ? ` — Previous: ${e.previous}` : ''}`).join('\n')
  : '• No high-impact events today'
}

THIS WEEK'S UPCOMING HIGH-IMPACT EVENTS:
${highImpactForTrading(calendarEvents).slice(0, 8).map(e => `• ${e.date} ${e.time} — ${e.title} (${e.currency})`).join('\n') || '• None identified'}

MARCO'S LAST 7 DAYS TRADING:
${trades.length > 0
  ? trades.map(t => `• ${t.symbol} ${t.trade_type.toUpperCase()} — ${t.session} — P&L: $${t.net_profit}`).join('\n')
  : '• No recent trades (or MT5 not yet synced)'
}

PORTFOLIO HOLDINGS:
${holdings.map(h => `• ${h.ticker} — ${h.asset_type} — ${h.quantity} units @ avg $${h.avg_buy_price}`).join('\n') || '• Not yet configured'}

Write a comprehensive briefing with these sections:
1. **GOLD (XAUUSD) — Outlook & Bias** — where is gold going today and this week? Key levels, sentiment, central bank flows, safe-haven demand. Give a clear BULLISH / BEARISH / NEUTRAL bias with reasoning.
2. **NASDAQ (NAS100) — Outlook & Bias** — tech sector health, Fed expectations impact, key levels, momentum. Clear bias.
3. **DOLLAR INDEX (DXY)** — direction and what it means for Marco's trades.
4. **STOCKS TO WATCH** — NVDA, MSFT updates. Any sector moves. What matters for Marco's portfolio.
5. **TODAY'S KEY EVENTS** — interpret each economic event: what's expected, what a surprise in either direction means for Gold and Nasdaq. Practical trading guidance.
6. **WORLD MACRO OVERVIEW** — major geopolitical/macro developments: central bank actions, Fed/ECB/BOJ policy, inflation trends, recession indicators, major leaders' economic actions, geopolitical tensions affecting markets.
7. **MARCO'S TRADING EDGE TODAY** — based on his recent 7-day data, what should he focus on today? Any patterns or warnings?
8. **RISK ALERTS** — specific risks to watch today.

Be comprehensive but scannable. Use specific numbers, price levels, percentages wherever possible.`

    // Call Groq (Llama)
    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  2048,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    })

    const briefingText: string = completion.choices[0]?.message?.content ?? ''

    // Parse bias from text (simple heuristic)
    const goldBias    = briefingText.toLowerCase().includes('gold') && briefingText.toLowerCase().includes('bullish') ? 'bullish'
                       : briefingText.toLowerCase().includes('gold') && briefingText.toLowerCase().includes('bearish') ? 'bearish' : 'neutral'
    const nasdaqBias  = briefingText.toLowerCase().includes('nasdaq') && briefingText.toLowerCase().includes('bullish') ? 'bullish'
                       : briefingText.toLowerCase().includes('nasdaq') && briefingText.toLowerCase().includes('bearish') ? 'bearish' : 'neutral'
    const dollarBias  = briefingText.toLowerCase().includes('dxy') && briefingText.toLowerCase().includes('bearish') ? 'bearish'
                       : briefingText.toLowerCase().includes('dxy') && briefingText.toLowerCase().includes('bullish') ? 'bullish' : 'neutral'

    // Store in Supabase
    const { data: savedBriefing, error } = await supabase
      .from('macro_briefings')
      .insert({
        briefing_date:     new Date().toISOString().split('T')[0],
        briefing_type:     'morning',
        gold_bias:         goldBias,
        nasdaq_bias:       nasdaqBias,
        dollar_outlook:    dollarBias,
        key_events:        todayEvents,
        full_briefing_text: briefingText,
        sent_to_telegram:  false,
      })
      .select()
      .single()

    if (error) throw new Error(`Supabase insert: ${error.message}`)

    return NextResponse.json({ briefing: savedBriefing, text: briefingText })
  } catch (err: unknown) {
    console.error('[macro POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Briefing generation failed' },
      { status: 500 }
    )
  }
}
