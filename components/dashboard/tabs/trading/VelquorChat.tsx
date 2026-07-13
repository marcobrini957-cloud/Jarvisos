'use client'

import { useState, useRef, useEffect } from 'react'
import { tradeResult, BE_THRESHOLD } from '@/hooks/useTrades'
import Panel from '@/components/ui/Panel'
import type { Trade } from '@/types'

// ── VELQUOR AI Chat ────────────────────────────────────────────────────────────

interface ChatMsg { role: 'user' | 'assistant'; text: string }

export function VelquorChat({ trades }: { trades: Trade[] }) {
  const [msgs,    setMsgs]    = useState<ChatMsg[]>([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const closed = trades.filter(t => t.net_profit !== null)
  const totalPnl  = closed.reduce((a, t) => a + (t.net_profit ?? 0), 0)
  const wins      = closed.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
  const losses    = closed.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
  const breakeven = closed.filter(t => Math.abs(t.net_profit ?? 0) <= BE_THRESHOLD).length
  const decisive  = wins + losses
  const wr        = decisive > 0 ? ((wins / decisive) * 100).toFixed(1) : '0'

  // Build a compact context string from real trade data
  const context = [
    `Total closed trades: ${closed.length} (break-even threshold: ±€${BE_THRESHOLD})`,
    `Win rate: ${wr}%  (${wins}W / ${breakeven}BE / ${losses}L — BE excluded from WR denominator)`,
    `Total P&L: €${totalPnl.toFixed(2)}`,
    // Day of week breakdown
    (() => {
      const days: Record<number, { wins: number; be: number; total: number; pnl: number }> = {}
      for (const t of closed) {
        const d = t.close_time ? new Date(t.close_time).getDay() : -1
        if (d < 1 || d > 5) continue
        if (!days[d]) days[d] = { wins: 0, be: 0, total: 0, pnl: 0 }
        days[d].total++; days[d].pnl += t.net_profit ?? 0
        const r = tradeResult(t.net_profit ?? 0)
        if (r === 'win') days[d].wins++
        else if (r === 'breakeven') days[d].be++
      }
      const names = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      return 'P&L by day: ' + [1,2,3,4,5].filter(d => days[d]).map(d => {
        const decisive = days[d].wins + (days[d].total - days[d].wins - days[d].be)
        const wr = decisive > 0 ? ((days[d].wins / decisive) * 100).toFixed(0) : '0'
        return `${names[d]} ${wr}% WR (${days[d].be} BE) €${days[d].pnl.toFixed(0)}`
      }).join(', ')
    })(),
    // Symbol breakdown
    (() => {
      const map = new Map<string, { pnl: number; total: number; wins: number; be: number }>()
      for (const t of closed) {
        const sym = t.symbol?.includes('XAU') ? 'XAUUSD'
          : (t.symbol?.includes('NAS') || t.symbol?.includes('US100')) ? 'NAS100'
          : t.symbol ?? 'Other'
        const v = map.get(sym) ?? { pnl: 0, total: 0, wins: 0, be: 0 }
        v.total++; v.pnl += t.net_profit ?? 0
        const r = tradeResult(t.net_profit ?? 0)
        if (r === 'win') v.wins++
        else if (r === 'breakeven') v.be++
        map.set(sym, v)
      }
      return 'P&L by instrument: ' + [...map.entries()].map(([sym, v]) => {
        const decisive = v.wins + (v.total - v.wins - v.be)
        const wr = decisive > 0 ? ((v.wins / decisive) * 100).toFixed(0) : '0'
        return `${sym} ${wr}% WR (${v.be} BE) €${v.pnl.toFixed(0)} (${v.total} trades)`
      }).join(', ')
    })(),
    // Emotion data (if any)
    (() => {
      const withEmotion = closed.filter(t => t.emotion_pre)
      if (withEmotion.length === 0) return null
      const map = new Map<string, { pnl: number; total: number; wins: number; be: number }>()
      for (const t of withEmotion) {
        const e = t.emotion_pre!
        const v = map.get(e) ?? { pnl: 0, total: 0, wins: 0, be: 0 }
        v.total++; v.pnl += t.net_profit ?? 0
        const r = tradeResult(t.net_profit ?? 0)
        if (r === 'win') v.wins++
        else if (r === 'breakeven') v.be++
        map.set(e, v)
      }
      return 'Emotion results (' + withEmotion.length + ' trades annotated): ' + [...map.entries()].map(([e, v]) => {
        const decisive = v.wins + (v.total - v.wins - v.be)
        const wr = decisive > 0 ? ((v.wins / decisive) * 100).toFixed(0) : '0'
        return `${e} ${wr}% WR (${v.be} BE) €${v.pnl.toFixed(0)}`
      }).join(', ')
    })(),
    // Plan adherence
    (() => {
      const yes = closed.filter(t => t.followed_plan === true)
      const no  = closed.filter(t => t.followed_plan === false)
      if (yes.length + no.length === 0) return null
      const yPnl = yes.reduce((a, t) => a + (t.net_profit ?? 0), 0)
      const nPnl = no.reduce((a, t) => a + (t.net_profit ?? 0), 0)
      return `Plan adherence: followed=${yes.length} trades €${yPnl.toFixed(0)}, broke=${no.length} trades €${nPnl.toFixed(0)}`
    })(),
    // Tags
    (() => {
      const tagMap = new Map<string, { pnl: number; total: number }>()
      for (const t of closed) {
        for (const tag of t.tags ?? []) {
          const v = tagMap.get(tag) ?? { pnl: 0, total: 0 }
          v.total++; v.pnl += t.net_profit ?? 0
          tagMap.set(tag, v)
        }
      }
      if (tagMap.size === 0) return null
      return 'Mistake tags: ' + [...tagMap.entries()].map(([tag, v]) =>
        `${tag} (${v.total}x, avg €${(v.pnl / v.total).toFixed(0)})`
      ).join(', ')
    })(),
  ].filter(Boolean).join('\n')

  async function send() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setMsgs(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const res  = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context }),
      })
      const data = await res.json()
      setMsgs(prev => [...prev, { role: 'assistant', text: data.reply ?? data.error ?? 'Error' }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', text: 'Network error — try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const SUGGESTIONS = [
    'What is my worst trading day and why?',
    'Which instrument should I focus on?',
    'What does my data say about emotions?',
    'Where am I losing the most money?',
  ]

  return (
    <Panel title="Ask VELQUOR">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Chat messages */}
        {msgs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ color: 'var(--t3)', fontSize: '12px', marginBottom: '4px' }}>
              Ask anything about your trading data. VELQUOR has full context of your {closed.length} trades.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setInput(s)} style={{
                  fontSize: '11px', padding: '5px 10px', borderRadius: '6px',
                  background: 'var(--s2)', border: '1px solid var(--bd2)',
                  color: 'var(--t2)', cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--s2)'; e.currentTarget.style.color = 'var(--t2)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%', padding: '9px 13px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.role === 'user' ? 'var(--ac)' : 'var(--s2)',
                  border: m.role === 'assistant' ? '1px solid var(--bd2)' : 'none',
                  color: m.role === 'user' ? 'white' : 'var(--t1)',
                  fontSize: '13px', lineHeight: '1.6',
                }}>
                  {m.role === 'assistant' && (
                    <span style={{ fontSize: '10px', color: 'var(--t3)', display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>
                      VELQUOR
                    </span>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  padding: '9px 13px', borderRadius: '12px 12px 12px 2px',
                  background: 'var(--s2)', border: '1px solid var(--bd2)',
                  fontSize: '13px', color: 'var(--t3)',
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--t3)', display: 'block', marginBottom: '4px' }}>VELQUOR</span>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about your trades..."
            style={{
              flex: 1, padding: '9px 12px', borderRadius: '8px',
              background: 'var(--s2)', border: '1px solid var(--bd2)',
              color: 'var(--t1)', fontSize: '13px', outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--ac)' }}
            onBlur={e  => { e.currentTarget.style.borderColor = 'var(--bd2)' }}
          />
          <button onClick={send} disabled={!input.trim() || loading} style={{
            padding: '9px 16px', borderRadius: '8px',
            background: input.trim() && !loading ? 'var(--ac)' : 'var(--s3)',
            color:      input.trim() && !loading ? 'white'      : 'var(--t3)',
            border: 'none', fontSize: '13px', cursor: input.trim() && !loading ? 'pointer' : 'default',
            fontWeight: 500, transition: 'all 0.12s',
          }}>
            Ask
          </button>
        </div>

        {msgs.length > 0 && (
          <button onClick={() => setMsgs([])} style={{
            alignSelf: 'flex-start', fontSize: '11px', color: 'var(--t3)',
            background: 'none', border: 'none', cursor: 'pointer', padding: '0',
          }}>
            Clear conversation
          </button>
        )}
      </div>
    </Panel>
  )
}
