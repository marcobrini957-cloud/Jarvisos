import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const maxDuration = 60

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json()

    if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

    const now = new Date()
    const todayStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const systemPrompt = `You are Jarvis, Marco's personal AI — trading analyst and market expert. Marco is a Forex day trader in Vienna trading XAUUSD and NAS100 in EUR. Today is ${todayStr}.

CRITICAL: Never state current market prices or "right now" conditions as fact — your training data has a cutoff and prices change constantly. If asked about current price levels, say you don't have real-time data and to check the Macro tab. For historical analysis (gold over 20 years, etc.) use your knowledge freely and confidently — that is historical fact.

When given trading data: be direct, reference actual numbers, identify patterns, 2-4 sentences.
When asked general market/trading questions: answer freely and thoroughly using your full knowledge.
Format numbers with € and %. Never refuse a question.`

    const userPrompt = context
      ? `Here is Marco's current trading data:\n\n${context}\n\nQuestion: ${message}`
      : message

    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages: [
        { role: 'system',  content: systemPrompt },
        { role: 'user',    content: userPrompt   },
      ],
      temperature: 0.5,
      max_tokens:  1024,
    })

    const reply = completion.choices[0]?.message?.content ?? 'No response.'
    return NextResponse.json({ reply })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
