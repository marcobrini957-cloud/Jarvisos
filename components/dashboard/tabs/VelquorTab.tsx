'use client'

import { useState, useRef, useEffect } from 'react'
import Panel from '@/components/ui/Panel'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_ACTIONS = [
  "Full performance analysis — what's working and what isn't?",
  "Why am I losing on Nasdaq?",
  "Mood vs P&L — what's the pattern?",
  "Am I overtrading?",
  "What setup wins most for me?",
  "How does my energy level affect my trading?",
]

export default function VelquorTab() {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [streaming,  setStreaming]  = useState(false)
  const [hasLoaded,  setHasLoaded]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function ask(query: string) {
    if (streaming || !query.trim()) return
    setStreaming(true)
    setHasLoaded(true)

    const userMsg: Message = { role: 'user', content: query }
    setMessages(prev => [...prev, userMsg])

    // Placeholder for streaming assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/velquor/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message: query,
          history: messages.slice(-10),
        }),
      })

      if (!res.ok || !res.body) {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: 'Error reaching VELQUOR. Check that GROQ_API_KEY is set in environment variables.' }
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
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(232,201,106,0.06)', border: '1px solid rgba(232,201,106,0.15)' }}>
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ width: '48px', height: '48px', background: 'rgba(232,201,106,0.12)', border: '1px solid rgba(232,201,106,0.25)' }}>
            <span style={{ fontSize: '24px' }}>🤖</span>
          </div>
          <div>
            <h2 style={{ color: 'var(--go2)', fontSize: '18px', fontWeight: 600 }}>VELQUOR AI</h2>
            <p style={{ color: 'var(--t2)', fontSize: '13px', marginTop: '3px', lineHeight: 1.5 }}>
              Your personal trading coach. VELQUOR analyses your trade history, journal entries, and portfolio data to give you real, specific insights about your performance, habits, and psychology.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat */}
        <div className="lg:col-span-2">
          <Panel title="Ask VELQUOR" noPadding>
            {/* Messages */}
            <div style={{ minHeight: '300px', maxHeight: '500px', overflowY: 'auto', padding: '16px' }}>
              {!hasLoaded && messages.length === 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  <p style={{ color: 'var(--t3)', fontSize: '12px', marginBottom: '8px' }}>Quick questions:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {QUICK_ACTIONS.map((q, i) => (
                      <button key={i} onClick={() => ask(q)}
                        className="text-left px-4 py-3 rounded-lg transition-colors"
                        style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '12px', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--s2)'; e.currentTarget.style.color = 'var(--t2)' }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mr-2 flex items-start">
                      <div className="flex items-center justify-center rounded-lg"
                        style={{ width: '28px', height: '28px', background: 'rgba(232,201,106,0.15)', border: '1px solid rgba(232,201,106,0.2)', fontSize: '14px' }}>
                        🤖
                      </div>
                    </div>
                  )}
                  <div style={{
                    maxWidth: '80%',
                    background: msg.role === 'user' ? 'rgba(55,138,221,0.15)' : 'rgba(232,201,106,0.06)',
                    border:     msg.role === 'user' ? '1px solid rgba(55,138,221,0.25)' : '1px solid rgba(232,201,106,0.15)',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '10px 14px',
                  }}>
                    {msg.role === 'assistant' && msg.content === '' && streaming ? (
                      <span style={{ color: 'var(--go2)' }}>▌</span>
                    ) : (
                      <p style={{
                        color:      msg.role === 'user' ? 'var(--t1)' : 'var(--t1)',
                        fontSize:   '13px', lineHeight: '1.7',
                        whiteSpace: 'pre-line',
                      }}>
                        {msg.content}
                        {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                          <span style={{ color: 'var(--go2)' }}>▌</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 p-3" style={{ borderTop: '1px solid var(--bd)' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
                placeholder="Ask VELQUOR about your trading, performance, or anything…"
                disabled={streaming}
                className="flex-1 px-3 py-2.5 rounded-md outline-none"
                style={{
                  background: 'var(--s2)', border: '1px solid var(--bd2)',
                  color: 'var(--t1)', fontSize: '13px',
                  opacity: streaming ? 0.6 : 1,
                }}
              />
              <button onClick={handleSubmit} disabled={streaming || !input.trim()}
                style={{
                  padding: '0 16px', borderRadius: '8px', border: '1px solid rgba(232,201,106,0.3)',
                  background: 'rgba(232,201,106,0.12)', color: 'var(--go2)',
                  fontSize: '13px', cursor: (streaming || !input.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (streaming || !input.trim()) ? 0.5 : 1, fontWeight: 500,
                }}>
                {streaming ? '…' : 'Ask'}
              </button>
            </div>
          </Panel>
        </div>

        {/* Right — info + quick actions */}
        <div className="flex flex-col gap-4">
          <Panel title="What VELQUOR Knows">
            <div className="flex flex-col gap-3">
              {[
                { icon: '📊', label: 'All your MT5 trades', sub: 'P&L, win rate, sessions, setups' },
                { icon: '📓', label: 'Journal entries',     sub: 'Mood, energy, daily notes' },
                { icon: '✅', label: 'Habits tracker',      sub: 'Daily streaks, consistency' },
                { icon: '💼', label: 'Portfolio',           sub: 'Trade Republic holdings' },
                { icon: '🌍', label: 'Macro context',       sub: 'News, events, bias' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex-shrink-0 text-lg">{item.icon}</div>
                  <div>
                    <p style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500 }}>{item.label}</p>
                    <p style={{ color: 'var(--t3)', fontSize: '11px' }}>{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Example Questions">
            <div className="flex flex-col gap-1.5">
              {[
                '"What time of day should I stop trading?"',
                '"Am I overtrading?"',
                '"When do I trade best — morning or afternoon?"',
                '"What happens to my P&L when I trade angry?"',
                '"What setup wins most for me?"',
                '"What are my worst trading habits?"',
              ].map((q, i) => (
                <button key={i} onClick={() => ask(q.replace(/"/g, ''))}
                  className="text-left py-2 px-1 rounded transition-colors"
                  style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '11px', cursor: 'pointer', lineHeight: 1.5 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ac)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}>
                  {q}
                </button>
              ))}
            </div>
          </Panel>

          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); setHasLoaded(false) }}
              style={{
                background: 'var(--s2)', border: '1px solid var(--bd2)',
                borderRadius: '8px', padding: '10px', color: 'var(--t3)',
                fontSize: '12px', cursor: 'pointer',
              }}>
              ↺ Clear conversation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
