import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getAuthUser } from '@/lib/api/auth'
import { withinAiLimit } from '@/lib/api/aiRateLimit'

export const maxDuration = 60

// POST /api/journal/transcribe — audio blob in, journal-ready text out.
// Groq-hosted Whisper: effectively free at our volume (~$0.04/audio-hour),
// no extra API account needed beyond the existing GROQ_API_KEY.
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await withinAiLimit(user.id, 'transcribe'))) return NextResponse.json({ error: 'Daily limit reached — try again tomorrow.' }, { status: 429 })

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'Transcription not configured' }, { status: 503 })
  }

  const form = await req.formData().catch(() => null)
  const audio = form?.get('audio')
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
  }
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Recording too large (max 25 MB)' }, { status: 413 })
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const result = await groq.audio.transcriptions.create({
      file:  audio,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      // Traders monologue in mixed English/German around here — let Whisper
      // auto-detect rather than forcing a language.
      temperature: 0,
    })
    return NextResponse.json({ text: result.text?.trim() ?? '' })
  } catch (err) {
    console.error('[transcribe]', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
