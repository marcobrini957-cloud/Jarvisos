import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const maxDuration = 60

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json()

    if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

    const systemPrompt = `You are Jarvis, a personal trading analyst AI for Marco, a Forex day trader based in Vienna trading EUR.
You have access to Marco's real trading data and should give direct, specific, actionable insights.
Be concise — 2-4 sentences max unless a detailed breakdown is asked for.
Never be vague. If the data shows a pattern, name it clearly.
Format numbers with € and % signs. Avoid generic trading advice.`

    const userPrompt = context
      ? `Here is Marco's current trading data:\n\n${context}\n\nQuestion: ${message}`
      : message

    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages: [
        { role: 'system',  content: systemPrompt },
        { role: 'user',    content: userPrompt   },
      ],
      temperature: 0.3,
      max_tokens:  512,
    })

    const reply = completion.choices[0]?.message?.content ?? 'No response.'
    return NextResponse.json({ reply })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
