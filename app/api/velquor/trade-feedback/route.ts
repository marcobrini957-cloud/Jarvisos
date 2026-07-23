import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserId } from '@/lib/api/auth'
import { withinAiLimit } from '@/lib/api/aiRateLimit'

export const maxDuration = 30

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface TradeFeedbackBody {
  tradeId:     string
  symbol:      string
  type:        string
  pnl:         number
  setupType:   string | null
  emotion:     string | null
  tags:        string[]
  followedPlan:boolean | null
  notes:       string | null
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await withinAiLimit(userId, 'trade-feedback'))) return NextResponse.json({ error: 'Daily AI limit reached — try again tomorrow.' }, { status: 429 })

    const body = await req.json() as TradeFeedbackBody

    const supabase = await createClient()

    // Fetch last 20 trades for pattern context
    const { data: recentTrades } = await supabase
      .from('trades')
      .select('symbol,trade_type,net_profit,setup_type,emotion_pre,tags,followed_plan,session')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .neq('symbol', 'BALANCE')
      .order('close_time', { ascending: false })
      .limit(20)

    const recent = recentTrades ?? []
    const wins   = recent.filter(t => (t.net_profit ?? 0) > 10).length
    const losses = recent.filter(t => (t.net_profit ?? 0) < -10).length
    const recentWR = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(0) : '?'
    const recentPnl = recent.reduce((s, t) => s + (t.net_profit ?? 0), 0)

    // Emotion pattern
    const emotionPnl = new Map<string, number[]>()
    for (const t of recent) {
      if (t.emotion_pre) {
        const arr = emotionPnl.get(t.emotion_pre) ?? []
        arr.push(t.net_profit ?? 0)
        emotionPnl.set(t.emotion_pre, arr)
      }
    }
    const emotionCtx = [...emotionPnl.entries()]
      .map(([e, vals]) => `${e}: avg €${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(0)}`)
      .join(', ')

    const prompt = `You are VELQUOR, a direct trading coach. Analyze this trade and give exactly 2-3 sentences of feedback.

TRADE:
- Instrument: ${body.symbol} ${body.type.toUpperCase()}
- P&L: €${body.pnl >= 0 ? '+' : ''}${body.pnl.toFixed(2)}
- Setup: ${body.setupType ?? 'not tagged'}
- Emotion before entry: ${body.emotion ?? 'not noted'}
- Tags: ${body.tags.length > 0 ? body.tags.join(', ') : 'none'}
- Followed plan: ${body.followedPlan === true ? 'yes' : body.followedPlan === false ? 'no' : 'not noted'}
- Notes: ${body.notes ?? 'none'}

RECENT CONTEXT (last 20 trades):
- Win rate: ${recentWR}% (${wins}W/${losses}L)
- Total P&L: €${recentPnl.toFixed(0)}
- Emotion P&L patterns: ${emotionCtx || 'no emotion data'}

Give 2-3 direct sentences. Reference patterns from recent data if relevant. No fluff.`

    const resp = await groq.chat.completions.create({
      model:       'llama-3.1-8b-instant',
      max_tokens:  200,
      temperature: 0.4,
      messages:    [{ role: 'user', content: prompt }],
      stream:      false,
    })

    const feedback = resp.choices[0]?.message?.content?.trim() ?? 'No feedback available.'
    return NextResponse.json({ feedback })
  } catch (err) {
    console.error('[trade-feedback]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
