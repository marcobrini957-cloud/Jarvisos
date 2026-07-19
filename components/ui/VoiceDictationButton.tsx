'use client'

import { useRef, useState } from 'react'

type DictationState = 'idle' | 'recording' | 'transcribing'

// Mic button: hold a voice monologue, get journal-ready text back.
// MediaRecorder → /api/journal/transcribe (Groq Whisper) → onText(transcript).
export default function VoiceDictationButton({ onText }: { onText: (text: string) => void }) {
  const [state, setState] = useState<DictationState>('idle')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        setState('transcribing')
        try {
          const blob = new Blob(chunksRef.current, { type: mime })
          const form = new FormData()
          form.append('audio', new File([blob], `note.${mime.includes('webm') ? 'webm' : 'm4a'}`, { type: mime }))
          const res  = await fetch('/api/journal/transcribe', { method: 'POST', body: form })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
          if (data.text) onText(data.text)
          else setError('Nothing heard — try again closer to the mic.')
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Transcription failed')
        } finally {
          setState('idle')
          setElapsed(0)
        }
      }
      recorderRef.current = rec
      rec.start()
      setState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch {
      setError('Microphone access denied')
    }
  }

  function stop() {
    recorderRef.current?.stop()
  }

  const recording = state === 'recording'
  const busy      = state === 'transcribing'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={busy}
        title={recording ? 'Stop and transcribe' : 'Dictate instead of typing'}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '6px 12px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600,
          background: recording ? 'rgba(255,61,80,0.12)' : 'var(--s2)',
          border: `1px solid ${recording ? 'rgba(255,61,80,0.4)' : 'var(--bd2)'}`,
          color: recording ? 'var(--re)' : busy ? 'var(--t3)' : 'var(--t2)',
          cursor: busy ? 'default' : 'pointer', transition: 'all 0.15s',
        }}
      >
        <span style={{
          width: '8px', height: '8px', borderRadius: recording ? '2px' : '50%',
          background: recording ? 'var(--re)' : busy ? 'var(--t3)' : 'var(--gr2)',
          animation: recording ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
        }} />
        {recording
          ? `Stop · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`
          : busy ? 'Transcribing…' : 'Dictate'}
      </button>
      {error && <span style={{ fontSize: '11px', color: 'var(--re)' }}>{error}</span>}
    </div>
  )
}
