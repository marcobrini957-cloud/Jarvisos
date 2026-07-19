'use client'

import { useState, useRef, useEffect } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'
import { useSpeech } from '@/hooks/useSpeech'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const CAPABILITIES = [
  { label: 'Your MT5 trades',   sub: 'P&L, win rate, sessions, setups' },
  { label: 'Journal & mood',    sub: 'How psychology moves your numbers' },
  { label: 'Discipline data',   sub: 'Habits, streaks, plan adherence' },
  { label: 'Portfolio & macro', sub: 'Holdings, news, market context' },
]

// Click → the full prompt lands in the composer for the user to send/edit.
const PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'Full trend analysis',
    prompt: 'Run a full trend analysis on my trading: overall P&L trajectory, win rate by month, whether my performance is improving or degrading, which instruments and sessions drive the trend, and the single clearest change I should make next week.',
  },
  {
    label: 'Weakness audit',
    prompt: 'Audit my weaknesses: which setups, sessions, days, and emotional states lose me the most money? Rank the top three leaks by euro impact and tell me the concrete rule that would plug each one.',
  },
  {
    label: 'Psychology check',
    prompt: 'Analyse the link between my journal moods and my trading results. When do I trade my worst — and what early warning signs show up in my own data before a losing streak?',
  },
  {
    label: 'Risk review',
    prompt: 'Review my risk management: average win vs average loss, position sizing consistency, worst losing streak, and whether my stop placement matches my actual results. Where am I taking too much or too little risk?',
  },
]

// Full-screen analyst chat. The intro plays once (localStorage-gated),
// afterwards the empty state renders without the staggered animation.
export default function VelquorTab() {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [animate,   setAnimate]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const { speak, speakingIdx } = useSpeech()

  useEffect(() => {
    const seen = localStorage.getItem('vq-analyst-intro-seen')
    if (!seen) {
      setAnimate(true)
      localStorage.setItem('vq-analyst-intro-seen', '1')
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function ask(query: string) {
    if (streaming || !query.trim()) return
    setStreaming(true)

    setMessages(prev => [...prev, { role: 'user', content: query }, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/velquor/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: query, history: messages.slice(-10) }),
      })

      if (!res.ok || !res.body) {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: 'The Analyst is unreachable right now. Try again in a moment.' }
          return copy
        })
        return
      }

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += dec.decode(value, { stream: true })
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: text }
          return copy
        })
      }
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: `Error: ${String(err)}` }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleSubmit() {
    if (!input.trim()) return
    ask(input)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  const empty = messages.length === 0

  const introStyle = (i: number): React.CSSProperties => animate
    ? { animation: `vq-analyst-in 0.6s cubic-bezier(0.22,1,0.36,1) both`, animationDelay: `${0.12 + i * 0.14}s` }
    : {}

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 158px)', minHeight: '480px',
    }}>
      <style>{`
        @keyframes vq-analyst-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vq-analyst-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,201,106,0.25); }
          50%      { box-shadow: 0 0 0 14px rgba(232,201,106,0); }
        }
      `}</style>

      {/* ── Conversation area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', paddingBottom: '24px' }}>

          {empty && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textAlign: 'center',
              minHeight: 'calc(100vh - 300px)', gap: '18px', paddingTop: '24px',
            }}>
              <div style={introStyle(0)}>
                <div style={{
                  display: 'inline-flex', padding: '14px', borderRadius: '20px',
                  background: 'rgba(232,201,106,0.07)', border: '1px solid rgba(232,201,106,0.2)',
                  animation: animate ? 'vq-analyst-ring 2.4s ease-in-out 1.2s 3' : 'none',
                }}>
                  <LogoMark size={44} />
                </div>
              </div>

              <div style={introStyle(1)}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', margin: 0 }}>
                  VELQUOR Analyst
                </h1>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--t2)', lineHeight: 1.65, maxWidth: '520px', margin: '10px auto 0' }}>
                  Your trading desk analyst. It reads your actual trade history, journal, and
                  discipline data — then answers with your numbers, not generic advice.
                  Ask why you lose on certain days, which setup carries you, or what to fix first.
                </p>
              </div>

              <div style={{ ...introStyle(2), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', width: '100%', maxWidth: '640px', marginTop: '6px' }}>
                {CAPABILITIES.map(c => (
                  <div key={c.label} style={{
                    padding: '12px 14px', borderRadius: '10px', textAlign: 'left',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bd2)',
                  }}>
                    <p style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>{c.label}</p>
                    <p style={{ fontSize: '11px', color: 'var(--t3)', margin: '3px 0 0', lineHeight: 1.45 }}>{c.sub}</p>
                  </div>
                ))}
              </div>

              <div style={{ ...introStyle(3), display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
                {PROMPTS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setInput(p.prompt)
                      inputRef.current?.focus()
                    }}
                    style={{
                      padding: '7px 14px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 600,
                      background: 'transparent', border: '1px solid rgba(232,201,106,0.28)',
                      color: 'var(--go2)', cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,201,106,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            msg.role === 'user' ? (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', margin: '20px 0' }}>
                <div style={{
                  maxWidth: '78%', padding: '11px 16px',
                  background: 'rgba(55,138,221,0.14)', border: '1px solid rgba(55,138,221,0.22)',
                  borderRadius: '14px 14px 3px 14px',
                }}>
                  <p style={{ color: 'var(--t1)', fontSize: '13.5px', fontWeight: 500, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line' }}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', gap: '12px', margin: '20px 0', alignItems: 'flex-start' }}>
                <div style={{
                  flexShrink: 0, marginTop: '2px', borderRadius: '9px', overflow: 'hidden',
                  outline: speakingIdx === i ? '2px solid rgba(232,201,106,0.5)' : 'none',
                }}>
                  <LogoMark size={26} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {msg.content === '' && streaming ? (
                    <span style={{ color: 'var(--go2)', fontSize: '14px' }}>▌</span>
                  ) : (
                    <>
                      <p style={{ color: 'var(--t1)', fontSize: '13.5px', fontWeight: 450, lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line' }}>
                        {msg.content}
                        {streaming && i === messages.length - 1 && <span style={{ color: 'var(--go2)' }}>▌</span>}
                      </p>
                      {msg.content && !streaming && (
                        <button
                          onClick={() => speak(msg.content, i)}
                          style={{
                            marginTop: '8px', padding: '3px 10px', borderRadius: '6px',
                            background: speakingIdx === i ? 'rgba(232,201,106,0.15)' : 'transparent',
                            border: '1px solid rgba(232,201,106,0.25)',
                            color: speakingIdx === i ? 'var(--go2)' : 'var(--t3)',
                            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {speakingIdx === i ? 'Stop' : 'Read aloud'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Composer ── */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: '10px',
            background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '14px',
            padding: '10px 12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
              placeholder="Ask the Analyst about your trading…"
              disabled={streaming}
              style={{
                flex: 1, resize: 'none', background: 'transparent', border: 'none',
                outline: 'none', color: 'var(--t1)', fontSize: '13.5px', fontWeight: 500,
                lineHeight: 1.6, maxHeight: '140px', opacity: streaming ? 0.6 : 1,
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={streaming || !input.trim()}
              style={{
                width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                border: 'none',
                background: input.trim() && !streaming ? 'var(--go2)' : 'var(--s3)',
                color: input.trim() && !streaming ? '#111' : 'var(--t3)',
                cursor: (streaming || !input.trim()) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 4px 0' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--t3)' }}>
              Answers are built from your own data. Not financial advice.
            </span>
            {messages.length > 0 && !streaming && (
              <button
                onClick={() => setMessages([])}
                style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '10.5px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
              >
                Clear conversation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
