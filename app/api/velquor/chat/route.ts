import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserId } from '@/lib/api/auth'
import { getUserPlan } from '@/lib/api/tier'
import { withinAiLimit } from '@/lib/api/aiRateLimit'
import {
  decided, realClosedTrades, monthlyFacts, groupBy, segmentLine, describeWindow,
} from '@/lib/ai/chatFacts'
import { BE_PIPS } from '@/lib/trading/stats'
import { ownCapital, hasCredit } from '@/lib/trading/capital'

export const maxDuration = 60

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ── Supabase context ──────────────────────────────────────────────────────────

async function buildContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  // A year, not thirty days: month questions ("how was my July") need whole
  // calendar months to answer, and the old fixed window meant any named month
  // was answered with the last-30-days figure instead.
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

  const [tradesRes, journalRes, snapshotRes, holdingsRes] = await Promise.all([
    supabase
      .from('trades')
      // status + lot_size are needed to tell a real trade from a balance
      // operation — a deposit used to count as a large win.
      .select('symbol,trade_type,net_profit,pips,session,setup_type,tags,emotion_pre,followed_plan,open_time,close_time,status,lot_size')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .gte('close_time', since)
      .order('close_time', { ascending: false })
      .limit(2000),
    supabase
      .from('journal_entries')
      .select('entry_date,mood,energy_level,body_text,tags,is_trading_day')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(10),
    supabase
      .from('account_snapshots')
      .select('balance,equity,credit,daily_pnl,weekly_pnl,monthly_pnl')
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

  // Balance operations are not trades. Everything below runs on real fills only.
  const t = realClosedTrades((tradesRes.data ?? []) as never)

  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const last30   = t.filter(x => (x.close_time ?? '') >= cutoff30)

  const all    = decided(t)
  const recent = decided(last30)
  const months = monthlyFacts(t, 6)

  const avgWinN  = last30.filter(x => (x.net_profit ?? 0) > 0)
  const avgLossN = last30.filter(x => (x.net_profit ?? 0) < 0)
  const avgWin  = avgWinN.length  > 0 ? (avgWinN.reduce((s,x)=>s+(x.net_profit??0),0)/avgWinN.length).toFixed(2)   : '0'
  const avgLoss = avgLossN.length > 0 ? (avgLossN.reduce((s,x)=>s+(x.net_profit??0),0)/avgLossN.length).toFixed(2) : '0'

  const tagTrades = new Map<string, typeof t>()
  for (const tr of last30) {
    for (const tag of tr.tags ?? []) {
      const arr = tagTrades.get(tag)
      if (arr) arr.push(tr); else tagTrades.set(tag, [tr])
    }
  }
  const tagSummary = Array.from(tagTrades.entries())
    .map(([tag, ts]) => segmentLine(tag, decided(ts)))
    .join('\n  ')

  const sessionSummary = Array.from(groupBy(last30, tr => tr.session ?? 'unknown').entries())
    .map(([s, ts]) => segmentLine(s, decided(ts)))
    .join('\n  ')

  const emotionSummary = Array.from(groupBy(last30, tr => tr.emotion_pre).entries())
    .map(([e, ts]) => {
      const d = decided(ts)
      return `${e}: avg €${(d.netPnl / ts.length).toFixed(2)}/trade over ${ts.length} trades, ${d.winRate}% WR`
    })
    .join('\n  ')

  const monthSummary = months.map(m => `  ${m.label} — ${describeWindow(m, m.key)}`).join('\n')

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
  // Equity includes broker credit, so the Analyst must be told what is actually
  // the trader's before it reasons about risk or position sizing off it.
  const acct = snapshot
    ? [
        `Balance: €${snapshot.balance}`,
        `Equity: €${snapshot.equity}`,
        ...(hasCredit(snapshot.credit)
          ? [`Broker credit (inside equity, NOT the trader's money): €${snapshot.credit}`,
             `Own capital (equity minus credit — use this for risk and sizing): €${ownCapital(snapshot.equity, snapshot.credit).toFixed(2)}`]
          : []),
        `Daily P&L: €${snapshot.daily_pnl}`,
        `Weekly P&L: €${snapshot.weekly_pnl}`,
        `Monthly P&L: €${snapshot.monthly_pnl}`,
      ].join(' | ')
    : 'No account snapshot available'

  return `
=== MARCO'S TRADING DATA ===

ACCOUNT: ${acct}

HOW A WIN RATE IS DEFINED HERE — this is the product's rule, do not use another:
win rate = wins / (wins + losses). A trade that moved less than ${BE_PIPS} pips is a
break-even and is excluded from BOTH sides — the test is the DISTANCE price
travelled, not the euros made, so the same scratch counts identically at 0.01
lots and at 1.00. Never call a trade a loss because its euro figure looks small
or large; that judgement is already made. Balance operations (deposits and
withdrawals) are not trades and are already excluded from everything below.
Every percentage in this block is already computed correctly — quote it as
given. Never re-derive a rate from trade counts, and never divide by total
trades.

${describeWindow(recent, 'LAST 30 DAYS')}
Avg Win: €${avgWin} | Avg Loss: €${avgLoss}

BY CALENDAR MONTH (use these for any question naming a month):
${monthSummary || '  no closed trades'}

${describeWindow(all, 'ALL TIME (last 12 months of history)')}

LAST 30 DAYS BY SESSION:
  ${sessionSummary || 'no data'}
LAST 30 DAYS BY SETUP/TAG:
  ${tagSummary || 'no tags yet'}
LAST 30 DAYS BY EMOTION:
  ${emotionSummary || 'no emotion data'}

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

    // The pricing page lists the Analyst as Pro and above. It was open to
    // everyone, which made the page a false claim and left a free account with
    // no reason to upgrade.
    const plan = await getUserPlan(userId)
    if (!plan.can.analyst) {
      return NextResponse.json(
        { error: 'The Analyst is part of Pro. Upgrade to ask questions about your own trading.', code: 'tier_required', requires: 'pro' },
        { status: 403 },
      )
    }

    if (!(await withinAiLimit(userId, 'velquor-chat'))) return NextResponse.json({ error: 'Daily AI limit reached — try again tomorrow.' }, { status: 429 })

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
- Quote the figures above exactly as given. Never compute a win rate yourself,
  and never divide wins by total trades — break-evens are already excluded
- If he names a month, answer from the BY CALENDAR MONTH block for that month,
  not from the 30-day window. Say which window you are quoting
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
