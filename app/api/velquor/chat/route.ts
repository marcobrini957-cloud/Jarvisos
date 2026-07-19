import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserId } from '@/lib/api/auth'
import { BE_THRESHOLD } from '@/lib/trading/stats'

export const maxDuration = 60

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ── Supabase context ──────────────────────────────────────────────────────────

async function buildContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [tradesRes, journalRes, snapshotRes, holdingsRes] = await Promise.all([
    supabase
      .from('trades')
      .select('symbol,trade_type,net_profit,pips,session,setup_type,tags,emotion_pre,followed_plan,open_time,close_time')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .gte('close_time', since)
      .order('close_time', { ascending: false })
      .limit(100),
    supabase
      .from('journal_entries')
      .select('entry_date,mood,energy_level,body_text,tags,is_trading_day')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(10),
    supabase
      .from('account_snapshots')
      .select('balance,equity,daily_pnl,weekly_pnl,monthly_pnl')
      .eq('user_id', userId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('portfolio_holdings')
      .select('ticker,name,quantity,avg_buy_price,currency,sector')
      .eq('user_id', userId)
      .eq('is_active', true),
  ])

  const t = (tradesRes.data ?? [])
  const wins     = t.filter(x => (x.net_profit ?? 0) > BE_THRESHOLD)
  const losses   = t.filter(x => (x.net_profit ?? 0) < -BE_THRESHOLD)
  const winRate  = t.length > 0 ? (wins.length / t.length * 100).toFixed(1) : '0'
  const totalPnl = t.reduce((s, x) => s + (x.net_profit ?? 0), 0).toFixed(2)
  const avgWin   = wins.length   > 0 ? (wins.reduce((s,x)=>s+(x.net_profit??0),0)/wins.length).toFixed(2)   : '0'
  const avgLoss  = losses.length > 0 ? (losses.reduce((s,x)=>s+(x.net_profit??0),0)/losses.length).toFixed(2) : '0'

  const tagMap = new Map<string, { w: number; t: number }>()
  for (const tr of t) {
    for (const tag of tr.tags ?? []) {
      const s = tagMap.get(tag) ?? { w: 0, t: 0 }
      s.t++
      if ((tr.net_profit ?? 0) > BE_THRESHOLD) s.w++
      tagMap.set(tag, s)
    }
  }
  const tagSummary = Array.from(tagMap.entries())
    .map(([tag, s]) => `${tag}: ${(s.w/s.t*100).toFixed(0)}% WR (${s.t} trades)`)
    .join(', ')

  const sessionMap = new Map<string, { w: number; t: number }>()
  for (const tr of t) {
    const s = tr.session ?? 'unknown'
    const cur = sessionMap.get(s) ?? { w: 0, t: 0 }
    cur.t++
    if ((tr.net_profit ?? 0) > BE_THRESHOLD) cur.w++
    sessionMap.set(s, cur)
  }
  const sessionSummary = Array.from(sessionMap.entries())
    .map(([s, v]) => `${s}: ${(v.w/v.t*100).toFixed(0)}% WR (${v.t} trades)`)
    .join(', ')

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

  const journalSummary = (journalRes.data ?? []).map(j =>
    `${j.entry_date}: mood=${j.mood ?? '?'}, energy=${j.energy_level ?? '?'}/10, trading=${j.is_trading_day ? 'yes' : 'no'}`
    + (j.body_text ? ` — "${j.body_text.slice(0, 100)}"` : '')
  ).join('\n')

  const portfolioSummary = (holdingsRes.data ?? []).map(h =>
    `${h.ticker} (${h.currency}): ${h.quantity} shares @ ${h.currency === 'EUR' ? '€' : '$'}${h.avg_buy_price}`
  ).join(', ')

  const snapshot = snapshotRes.data
  const acct = snapshot
    ? `Balance: €${snapshot.balance} | Equity: €${snapshot.equity} | Daily P&L: €${snapshot.daily_pnl} | Weekly P&L: €${snapshot.weekly_pnl} | Monthly P&L: €${snapshot.monthly_pnl}`
    : 'No account snapshot available'

  return `
=== MARCO'S TRADING DATA ===

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

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, history = [] } = await req.json()
    if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

    const supabase = await createClient()
    const context  = await buildContext(supabase, userId)

    const now = new Date()
    const todayStr = now.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Vienna',
    })
    const timeStr = now.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna',
    })

    const systemPrompt = `You are VELQUOR, Marco's personal trading coach and performance analyst.
TODAY: ${todayStr}, ${timeStr} Vienna time

${context}

═══════════════════════════════════════════
YOUR ROLE — WHAT YOU CAN AND CANNOT DO
═══════════════════════════════════════════

YOU ARE A PERSONAL DATA ANALYST AND TRADING COACH — NOT A MARKET ANALYST.

WHAT YOU CAN DO:
✓ Analyse Marco's trade history, P&L, win rates, session patterns, setup performance
✓ Analyse his journal: mood trends, energy vs performance, emotional patterns
✓ Identify habits, mistakes, and behavioural patterns from his data
✓ Give coaching advice on trading psychology, discipline, consistency, and mindset
✓ Answer questions like "am I overtrading?", "what setup works best for me?", "how is my mood affecting my P&L?"
✓ Share general principles about trader psychology and discipline (e.g. "revenge trading is dangerous because...", "consistency matters because...")

WHAT YOU CANNOT DO:
✗ You have no access to live market data, prices, charts, or indicators
✗ You cannot tell Marco what gold, NAS100, DXY, or any instrument is doing right now
✗ You cannot give market bias, entry ideas, or technical analysis — you have no price data
✗ Do not guess or fabricate any price levels, RSI values, MA values, or market conditions

WHEN ASKED ABOUT THE MARKET (current prices, bias, "should I trade now?", technical levels):
Respond like this: "I only have access to your personal trading data — I can't see live prices or market conditions. For current market context, check the News tab. What I can tell you is [pivot to something useful from his data — e.g. how he's performed at this time of day, his win rate in this session, etc.]."

═══════════════════════════════════════════
HOW TO RESPOND
═══════════════════════════════════════════

- Always reference actual numbers from Marco's data when available
- Be direct — identify patterns, name problems, give specific observations
- If something is concerning (overtrading, trading angry, loss streaks), say it clearly
- For psychology/mindset questions: give concrete, practical coaching advice
- Keep answers focused and useful — no filler, no hedging on things you know`

    const messages = [
      ...history.slice(-10),
      { role: 'user' as const, content: message },
    ]

    const stream = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  2048,
      temperature: 0.4,
      messages:    [{ role: 'system', content: systemPrompt }, ...messages],
      stream:      true,
    })

    const encoder  = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type':      'text/plain; charset=utf-8',
        'Cache-Control':     'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[velquor/chat]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
