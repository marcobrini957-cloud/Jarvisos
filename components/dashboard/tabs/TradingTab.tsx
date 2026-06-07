'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useTrades, tradeResult, BE_THRESHOLD } from '@/hooks/useTrades'
import { generateInsights } from '@/lib/intelligence'
import InsightCard          from '@/components/ui/InsightCard'
import PeriodMetricCard, { type Period } from '@/components/ui/PeriodMetricCard'
import Panel from '@/components/ui/Panel'
import Badge from '@/components/ui/Badge'
import type { Trade } from '@/types'

// ── Trade Annotation Modal ─────────────────────────────────────────────────────

const SETUP_TYPES = ['ICT Order Block', 'BOS / CHoCH', 'Fair Value Gap', 'Liquidity Grab', 'Support / Resistance', 'Trend Follow', 'Scalp', 'Other']
const MISTAKE_TAGS = ['FOMO', 'Revenge trade', 'Early exit', 'Late entry', 'Oversize', 'No SL', 'News blindspot', 'Emotional']

function TradeAnnotationModal({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const [setupType,    setSetup]    = useState(trade.setup_type  ?? '')
  const [rationale,   setRationale] = useState(trade.trade_rationale ?? '')
  const [emotion,     setEmotion]   = useState(trade.emotion_pre ?? '')
  const [followed,    setFollowed]  = useState<boolean | null>(trade.followed_plan ?? null)
  const [notes,       setNotes]     = useState(trade.notes ?? '')
  const [tags,        setTags]      = useState<string[]>(trade.tags ?? [])
  const [uploading,   setUploading] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState(trade.screenshot_open_url ?? '')
  const [saving,      setSaving]    = useState(false)
  const [saved,       setSaved]     = useState(false)

  const EMOTIONS = ['confident', 'neutral', 'anxious', 'tired', 'fomo']
  const EMOTION_COLORS: Record<string, string> = {
    confident: 'var(--gr2)', neutral: 'var(--t2)', anxious: 'var(--am2)', tired: 'var(--re)', fomo: '#e05cae',
  }

  function toggleTag(t: string) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('slot', 'open')
      const res = await fetch(`/api/trades/${trade.id}/screenshot`, { method: 'POST', body: form })
      const json = await res.json()
      if (json.url) setScreenshotUrl(json.url)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/trades/${trade.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          setup_type:      setupType || null,
          trade_rationale: rationale || null,
          emotion_pre:     emotion   || null,
          followed_plan:   followed,
          notes:           notes     || null,
          tags:            tags.length > 0 ? tags : null,
          screenshot_missing: !screenshotUrl,
        }),
      })
      setSaved(true)
      setTimeout(() => onClose(), 800)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)',
    borderRadius: '8px', padding: '10px 12px', color: 'var(--t1)', fontSize: '13px', outline: 'none',
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed z-50 rounded-xl flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '520px', maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '24px', overflowY: 'auto',
        }}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 600 }}>{trade.symbol}</span>
              <Badge variant={trade.trade_type as 'buy' | 'sell'}>{trade.trade_type.toUpperCase()}</Badge>
              {trade.session && (
                <Badge variant={trade.session as never}>
                  {trade.session === 'new_york' ? 'NY' : trade.session.charAt(0).toUpperCase() + trade.session.slice(1)}
                </Badge>
              )}
            </div>
            <p style={{ color: 'var(--t3)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {trade.open_time ? new Date(trade.open_time).toLocaleString('de-AT', { timeZone: 'Europe/Vienna', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              {' · '}
              {(() => {
                const pnl = trade.net_profit ?? 0
                const result = tradeResult(pnl)
                const color = result === 'win' ? 'var(--gr2)' : result === 'loss' ? 'var(--re)' : 'var(--ac)'
                return (
                  <>
                    <span style={{ color, fontWeight: 500 }}>{pnl >= 0 ? '+' : ''}€{pnl.toFixed(2)}</span>
                    {result === 'breakeven' && (
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(88,166,255,0.12)', color: 'var(--ac)', fontWeight: 600 }}>BE</span>
                    )}
                  </>
                )
              })()}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Setup type */}
        <div className="flex flex-col gap-1.5">
          <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Setup Type</label>
          <select value={setupType} onChange={e => setSetup(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">— Select setup —</option>
            {SETUP_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Why I took this trade */}
        <div className="flex flex-col gap-1.5">
          <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Why I took this trade</label>
          <textarea value={rationale} onChange={e => setRationale(e.target.value)}
            placeholder="What was your reason for entering? What confirmed the setup?"
            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.6' }}
            onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
            onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Notes / Observations</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="How did the trade play out? What would you do differently?"
            style={{ ...inputStyle, resize: 'vertical', minHeight: '70px', lineHeight: '1.6' }}
            onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
            onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
        </div>

        {/* Emotion */}
        <div className="flex flex-col gap-2">
          <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Emotional state before entry</label>
          <div className="flex gap-2 flex-wrap">
            {EMOTIONS.map(em => (
              <button key={em} onClick={() => setEmotion(em === emotion ? '' : em)}
                style={{
                  padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                  background: emotion === em ? `${EMOTION_COLORS[em]}15` : 'var(--s2)',
                  border:     emotion === em ? `1px solid ${EMOTION_COLORS[em]}` : '1px solid var(--bd2)',
                  color:      emotion === em ? EMOTION_COLORS[em] : 'var(--t2)',
                }}>
                {em}
              </button>
            ))}
          </div>
        </div>

        {/* Tags (mistakes + setups) */}
        <div className="flex flex-col gap-2">
          <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {MISTAKE_TAGS.map(t => (
              <button key={t} onClick={() => toggleTag(t)}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
                  background: tags.includes(t) ? 'rgba(226,75,74,0.12)' : 'var(--s2)',
                  border:     tags.includes(t) ? '1px solid rgba(226,75,74,0.35)' : '1px solid var(--bd2)',
                  color:      tags.includes(t) ? 'var(--re)' : 'var(--t3)',
                }}>
                #{t}
              </button>
            ))}
          </div>
        </div>

        {/* Followed plan */}
        <div className="flex items-center gap-3">
          <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Followed trading plan?</label>
          <div className="flex gap-2">
            {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
              <button key={String(opt.val)} onClick={() => setFollowed(followed === opt.val ? null : opt.val)}
                style={{
                  padding: '4px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                  background: followed === opt.val ? (opt.val ? 'rgba(99,153,34,0.15)' : 'rgba(226,75,74,0.12)') : 'var(--s2)',
                  border:     followed === opt.val ? `1px solid ${opt.val ? 'var(--gr2)' : 'var(--re)'}` : '1px solid var(--bd2)',
                  color:      followed === opt.val ? (opt.val ? 'var(--gr2)' : 'var(--re)') : 'var(--t3)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Screenshot */}
        <div className="flex flex-col gap-2">
          <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Chart Screenshot</label>
          {screenshotUrl ? (
            <div className="relative rounded-lg overflow-hidden" style={{ maxHeight: '180px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshotUrl} alt="Chart screenshot" style={{ width: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--bd2)' }} />
              <button onClick={() => setScreenshotUrl('')}
                style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}>
                Remove
              </button>
            </div>
          ) : (
            <label style={{ cursor: 'pointer' }}>
              <div className="flex flex-col items-center justify-center rounded-lg py-6 gap-2"
                style={{ border: '1px dashed var(--bd2)', background: 'var(--s2)' }}>
                {uploading ? (
                  <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Uploading…</span>
                ) : (
                  <>
                    <span style={{ fontSize: '24px' }}>📷</span>
                    <span style={{ color: 'var(--t2)', fontSize: '12px' }}>Click to upload chart screenshot</span>
                    <span style={{ color: 'var(--t3)', fontSize: '11px' }}>PNG, JPG up to 10MB</span>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleScreenshot} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving || saved}
          className="w-full py-3 rounded-md font-medium"
          style={{
            background: saved ? 'var(--gr)' : 'var(--ac)', border: 'none',
            color: 'white', fontSize: '13px', cursor: (saving || saved) ? 'default' : 'pointer',
          }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Annotation'}
        </button>
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function periodStart(p: Period): Date {
  const now = new Date()
  switch (p) {
    case 'D': return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    case 'W': {
      // Monday 00:00 of the current week
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const day = d.getDay() // 0=Sun
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      return d
    }
    case 'M': return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    case 'Q': return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1, 0, 0, 0, 0)
    case 'Y': return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
  }
}

function periodEnd(p: Period): Date {
  const now = new Date()
  switch (p) {
    case 'D': return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    case 'W': {
      const start = periodStart('W')
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)
    }
    case 'M': return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    case 'Q': {
      const qStart = Math.floor(now.getMonth() / 3) * 3
      return new Date(now.getFullYear(), qStart + 3, 0, 23, 59, 59, 999)
    }
    case 'Y': return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
  }
}

function filterByPeriod(trades: Trade[], p: Period): Trade[] {
  const start = periodStart(p)
  const end   = periodEnd(p)
  return trades.filter(t => {
    if (!t.close_time) return false
    const d = new Date(t.close_time)
    return d >= start && d <= end
  })
}

function calcPnl(trades: Trade[]): number {
  return trades.reduce((s, t) => s + (t.net_profit ?? 0), 0)
}

function calcWinRate(trades: Trade[]): { rate: number; wins: number; losses: number; breakeven: number; total: number } {
  const closed    = trades.filter(t => t.net_profit !== null)
  const wins      = closed.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD)
  const losses    = closed.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD)
  const breakeven = closed.filter(t => Math.abs(t.net_profit ?? 0) <= BE_THRESHOLD)
  const decisive  = wins.length + losses.length
  return {
    rate:      decisive > 0 ? (wins.length / decisive) * 100 : 0,
    wins:      wins.length,
    losses:    losses.length,
    breakeven: breakeven.length,
    total:     closed.length,
  }
}

function calcAvgRR(trades: Trade[]): number {
  const valid = trades.filter(t => t.stop_loss && t.take_profit && t.open_price)
  if (valid.length === 0) return 0
  return valid.reduce((s, t) => {
    const risk   = Math.abs((t.open_price ?? 0) - (t.stop_loss  ?? 0))
    const reward = Math.abs((t.take_profit ?? 0) - (t.open_price ?? 0))
    return s + (risk > 0 ? reward / risk : 0)
  }, 0) / valid.length
}

function calcMaxDrawdown(trades: Trade[]): number {
  const byDay = new Map<string, number>()
  for (const t of trades) {
    if (!t.close_time) continue
    const day = t.close_time.split('T')[0]
    byDay.set(day, (byDay.get(day) ?? 0) + (t.net_profit ?? 0))
  }
  const vals = Array.from(byDay.values())
  return vals.length > 0 ? Math.min(0, ...vals) : 0
}

function fmtPnl(n: number | null): string {
  if (n === null) return '—'
  return `${n >= 0 ? '+' : '-'}€${Math.abs(n).toFixed(2)}`
}

function fmtPips(p: number | null): string {
  if (p === null) return '—'
  return `${p > 0 ? '+' : ''}${p.toFixed(1)}p`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: 'short', timeZone: 'Europe/Vienna' })
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })
}

// ── Heatmap data from trades ──────────────────────────────────────────────────

function buildHeatmap(trades: Trade[]) {
  const days     = ['Mon','Tue','Wed','Thu','Fri']
  const sessions = [
    { label: 'London',  keys: ['london'] },
    { label: 'Overlap', keys: ['overlap'] },
    { label: 'NY',      keys: ['new_york'] },
  ]
  const cells: { session: string; day: string; winRate: number; trades: number }[] = []

  for (const { label, keys } of sessions) {
    for (const day of days) {
      const dayIndex = days.indexOf(day) + 1 // JS: 1=Mon...5=Fri
      const filtered = trades.filter(t => {
        if (!keys.includes(t.session ?? '')) return false
        if (!t.open_time) return false
        const d = new Date(t.open_time).getDay()
        return d === dayIndex
      })
      const wins    = filtered.filter(t => (t.net_profit ?? 0) > 0)
      const winRate = filtered.length > 0 ? wins.length / filtered.length : 0
      cells.push({ session: label, day, winRate, trades: filtered.length })
    }
  }
  return cells
}

function heatColor(wr: number, count: number) {
  if (count === 0) return { bg: 'var(--s3)', color: 'var(--t3)' }
  if (wr >= 0.65)  return { bg: 'rgba(99,153,34,0.30)',   color: 'var(--gr2)' }
  if (wr >= 0.45)  return { bg: 'rgba(186,117,23,0.22)',  color: 'var(--am2)' }
  return              { bg: 'rgba(226,75,74,0.20)',  color: 'var(--re)' }
}

// ── Jarvis AI Chat ────────────────────────────────────────────────────────────

interface ChatMsg { role: 'user' | 'assistant'; text: string }

function JarvisChat({ trades }: { trades: Trade[] }) {
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
    <Panel title="Ask Jarvis">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Chat messages */}
        {msgs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ color: 'var(--t3)', fontSize: '12px', marginBottom: '4px' }}>
              Ask anything about your trading data. Jarvis has full context of your {closed.length} trades.
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
                      JARVIS
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
                  <span style={{ fontSize: '10px', color: 'var(--t3)', display: 'block', marginBottom: '4px' }}>JARVIS</span>
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

// ── Analytics helpers ─────────────────────────────────────────────────────────

function winRateColor(wr: number) {
  if (wr >= 65) return 'var(--gr2)'
  if (wr >= 50) return 'var(--am2)'
  return 'var(--re)'
}

function StatRow({ label, trades: rowTrades, avgPnl, highlight }: {
  label: string
  trades: Trade[]
  avgPnl: number
  highlight?: boolean
}) {
  const total     = rowTrades.length
  if (total === 0) return null
  const wins      = rowTrades.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
  const losses    = rowTrades.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
  const breakeven = rowTrades.filter(t => Math.abs(t.net_profit ?? 0) <= BE_THRESHOLD).length
  const decisive  = wins + losses
  const wr        = decisive > 0 ? (wins / decisive) * 100 : 0
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 90px 60px 80px',
      alignItems: 'center', gap: '8px',
      padding: '8px 0',
      borderBottom: '1px solid var(--bd)',
      background: highlight ? 'rgba(88,166,255,0.04)' : 'transparent',
    }}>
      <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: highlight ? 500 : 400 }}>{label}</span>
      {/* W / BE / L counts */}
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(99,153,34,0.15)', color: 'var(--gr2)' }}>{wins}W</span>
        {breakeven > 0 && (
          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(88,166,255,0.12)', color: 'var(--ac)' }}>{breakeven}BE</span>
        )}
        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(226,75,74,0.15)', color: 'var(--re)' }}>{losses}L</span>
      </div>
      {/* Win rate bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ flex: 1, height: '4px', background: 'var(--s3)', borderRadius: '2px' }}>
          <div style={{ width: `${wr}%`, height: '100%', background: winRateColor(wr), borderRadius: '2px' }} />
        </div>
        <span style={{ color: winRateColor(wr), fontSize: '11px', fontWeight: 600, minWidth: '30px' }}>{wr.toFixed(0)}%</span>
      </div>
      <span style={{ color: avgPnl >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '11px', textAlign: 'right' }}>
        avg {avgPnl >= 0 ? '+' : ''}€{avgPnl.toFixed(2)}
      </span>
    </div>
  )
}

function TableHeader() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 90px 60px 80px',
      gap: '8px', padding: '0 0 6px 0',
      borderBottom: '1px solid var(--bd2)',
    }}>
      {['', 'W / BE / L', 'Win rate', 'Avg P&L'].map((h, i) => (
        <span key={i} style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em', textAlign: i > 0 ? 'right' : 'left' }}>
          {h}
        </span>
      ))}
    </div>
  )
}

// ── Full analytics panel ──────────────────────────────────────────────────────

function TradingInsights({ trades, allRows }: { trades: Trade[]; allRows: Trade[] }) {
  const closed = useMemo(() =>
    trades.filter(t => t.net_profit !== null && t.symbol !== 'BALANCE'),
  [trades])

  const insights = useMemo(() => generateInsights({
    trades:         [...trades, ...allRows.filter(t => t.symbol === 'BALANCE')],
    holdings:       [],
    journal:        [],
    tasks:          [],
    accountBalance: 0,
    portfolioValue: 0,
  }).filter(i => i.category === 'trading' || i.category === 'warning' || i.category === 'habits'),
  [trades, allRows])

  // Helper: group trades into { label, trades[] } for StatRow
  type Group = { label: string; trades: Trade[] }

  const avgPnl = (ts: Trade[]) => ts.length > 0 ? ts.reduce((a, t) => a + (t.net_profit ?? 0), 0) / ts.length : 0

  // ── Day of week ────────────────────────────────────────────────────────────
  const dayData = useMemo((): Group[] => {
    const map: Record<number, Trade[]> = {}
    for (const t of closed) {
      if (!t.close_time) continue
      const d = new Date(t.close_time).getDay()
      if (d === 0 || d === 6) continue
      ;(map[d] ??= []).push(t)
    }
    return [1, 2, 3, 4, 5].map(d => ({
      label:  ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][d],
      trades: map[d] ?? [],
    }))
  }, [closed])

  // ── Session ────────────────────────────────────────────────────────────────
  const sessionData = useMemo((): Group[] => [
    { key: 'london',   label: 'London'   },
    { key: 'overlap',  label: 'Overlap'  },
    { key: 'new_york', label: 'New York' },
    { key: 'asian',    label: 'Asian'    },
  ].map(s => ({ label: s.label, trades: closed.filter(t => t.session === s.key) }))
  , [closed])

  // ── Emotion ────────────────────────────────────────────────────────────────
  const emotionData = useMemo((): Group[] => {
    const map = new Map<string, Trade[]>()
    for (const t of closed.filter(t => t.emotion_pre)) {
      ;(map.get(t.emotion_pre!) ?? map.set(t.emotion_pre!, []).get(t.emotion_pre!)!).push(t)
    }
    return [...map.entries()]
      .map(([label, trades]) => ({ label, trades }))
      .sort((a, b) => {
        const wrOf = (ts: Trade[]) => { const w = ts.filter(t => (t.net_profit ?? 0) > BE_THRESHOLD).length; const l = ts.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length; return (w + l) > 0 ? w / (w + l) : 0 }
        return wrOf(b.trades) - wrOf(a.trades)
      })
  }, [closed])

  // ── Setup type ─────────────────────────────────────────────────────────────
  const setupData = useMemo((): Group[] => {
    const map = new Map<string, Trade[]>()
    for (const t of closed.filter(t => t.setup_type)) {
      ;(map.get(t.setup_type!) ?? map.set(t.setup_type!, []).get(t.setup_type!)!).push(t)
    }
    return [...map.entries()]
      .map(([label, trades]) => ({ label, trades }))
      .sort((a, b) => avgPnl(b.trades) - avgPnl(a.trades))
  }, [closed])

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tagData = useMemo((): Group[] => {
    const map = new Map<string, Trade[]>()
    for (const t of closed.filter(t => t.tags?.length)) {
      for (const tag of t.tags!) {
        ;(map.get(tag) ?? map.set(tag, []).get(tag)!).push(t)
      }
    }
    return [...map.entries()]
      .map(([label, trades]) => ({ label, trades }))
      .sort((a, b) => avgPnl(a.trades) - avgPnl(b.trades)) // worst first
  }, [closed])

  // ── Followed plan ──────────────────────────────────────────────────────────
  const planData = useMemo((): Group[] => [
    { label: 'Followed plan', trades: closed.filter(t => t.followed_plan === true)  },
    { label: 'Broke plan',    trades: closed.filter(t => t.followed_plan === false) },
  ].filter(r => r.trades.length > 0)
  , [closed])

  // ── Symbol ────────────────────────────────────────────────────────────────
  const symbolData = useMemo((): Group[] => {
    const map = new Map<string, Trade[]>()
    for (const t of closed) {
      const sym = t.symbol?.includes('XAU') ? 'XAUUSD'
        : (t.symbol?.includes('NAS') || t.symbol?.includes('US100')) ? 'NAS100'
        : t.symbol ?? 'Other'
      ;(map.get(sym) ?? map.set(sym, []).get(sym)!).push(t)
    }
    return [...map.entries()]
      .map(([label, trades]) => ({ label, trades }))
      .sort((a, b) => b.trades.length - a.trades.length)
  }, [closed])

  if (closed.length === 0) return null

  const subHead = (title: string) => (
    <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px', marginTop: '4px' }}>
      {title}
    </p>
  )

  const noData = (msg: string) => (
    <p style={{ color: 'var(--t3)', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>{msg}</p>
  )

  return (
    <Panel title={`Statistical Analysis — ${closed.length} trades`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left column */}
        <div className="flex flex-col gap-5">

          {/* Day of week */}
          <div>
            {subHead('Win rate by day of week')}
            <TableHeader />
            {dayData.filter(d => d.trades.length > 0).map(d => (
              <StatRow key={d.label} label={d.label} trades={d.trades} avgPnl={avgPnl(d.trades)} />
            ))}
            {dayData.every(d => d.trades.length === 0) && noData('No trades yet.')}
          </div>

          {/* Session */}
          <div>
            {subHead('Win rate by session')}
            <TableHeader />
            {sessionData.filter(s => s.trades.length > 0).map(s => (
              <StatRow key={s.label} label={s.label} trades={s.trades} avgPnl={avgPnl(s.trades)} />
            ))}
          </div>

          {/* Symbol */}
          <div>
            {subHead('Win rate by instrument')}
            <TableHeader />
            {symbolData.map(s => (
              <StatRow key={s.label} label={s.label} trades={s.trades} avgPnl={avgPnl(s.trades)} />
            ))}
          </div>

        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">

          {/* Emotion */}
          <div>
            {subHead('Win rate by pre-trade emotion')}
            {emotionData.length > 0 ? (
              <>
                <TableHeader />
                {emotionData.map((e, i) => (
                  <StatRow key={e.label} label={e.label} trades={e.trades} avgPnl={avgPnl(e.trades)} highlight={i === 0} />
                ))}
              </>
            ) : noData('Annotate trades with emotion to see this analysis.')}
          </div>

          {/* Followed plan */}
          <div>
            {subHead('Followed trading plan')}
            {planData.length > 0 ? (
              <>
                <TableHeader />
                {planData.map(p => (
                  <StatRow key={p.label} label={p.label} trades={p.trades} avgPnl={avgPnl(p.trades)} highlight={p.label === 'Followed plan'} />
                ))}
              </>
            ) : noData('Annotate trades with plan tracking to see this analysis.')}
          </div>

          {/* Setup type */}
          <div>
            {subHead('Win rate by setup type')}
            {setupData.length > 0 ? (
              <>
                <TableHeader />
                {setupData.map((s, i) => (
                  <StatRow key={s.label} label={s.label} trades={s.trades} avgPnl={avgPnl(s.trades)} highlight={i === 0} />
                ))}
              </>
            ) : noData('Annotate trades with setup type to see this analysis.')}
          </div>

          {/* Tags / mistake labels */}
          <div>
            {subHead('Mistake & pattern tags')}
            {tagData.length > 0 ? (
              <>
                <TableHeader />
                {tagData.map((t, i) => (
                  <StatRow key={t.label} label={t.label} trades={t.trades} avgPnl={avgPnl(t.trades)} highlight={i === tagData.length - 1} />
                ))}
              </>
            ) : noData('Tag trades (e.g. FOMO, revenge, early exit) to see the cost of each pattern.')}
          </div>

        </div>
      </div>

      {/* Insight cards — warnings + key findings */}
      {insights.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--bd)' }}>
          <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Key findings
          </p>
          <div className="flex flex-col gap-3">
            {insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} compact />
            ))}
          </div>
        </div>
      )}

      {/* Data summary footer */}
      {(() => {
        const emotionCount = closed.filter(t => t.emotion_pre).length
        const setupCount   = closed.filter(t => t.setup_type).length
        const planCount    = closed.filter(t => t.followed_plan !== null && t.followed_plan !== undefined).length
        const tagCount     = closed.filter(t => t.tags?.length).length
        const uniqueTags   = new Set(closed.flatMap(t => t.tags ?? [])).size
        const oldest       = closed.reduce((a, t) => !a || (t.open_time ?? '') < (a.open_time ?? '') ? t : a, closed[0])
        const newest       = closed.reduce((a, t) => !a || (t.open_time ?? '') > (a.open_time ?? '') ? t : a, closed[0])
        const dateRange    = oldest && newest && oldest !== newest
          ? `${new Date(oldest.open_time!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(newest.open_time!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : null

        return (
          <div style={{
            marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--bd)',
            display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
          }}>
            <span style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '4px' }}>
              Analyzing
            </span>
            {[
              { label: `${closed.length} trades`, always: true },
              { label: `${emotionCount} with emotion`, always: false, active: emotionCount > 0 },
              { label: `${setupCount} with setup type`, always: false, active: setupCount > 0 },
              { label: `${planCount} with plan data`, always: false, active: planCount > 0 },
              { label: `${tagCount} tagged · ${uniqueTags} unique tag${uniqueTags !== 1 ? 's' : ''}`, always: false, active: tagCount > 0 },
            ].map(chip => (
              <span key={chip.label} style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                background: (!chip.always && !chip.active) ? 'var(--s2)' : 'var(--s3)',
                color: (!chip.always && !chip.active) ? 'var(--t3)' : 'var(--t2)',
                border: '1px solid var(--bd)',
              }}>
                {chip.label}
              </span>
            ))}
            {dateRange && (
              <span style={{ fontSize: '11px', color: 'var(--t3)', marginLeft: 'auto' }}>
                {dateRange}
              </span>
            )}
          </div>
        )
      })()}
    </Panel>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TradingTab() {
  const { trades, allRows, stats, loading } = useTrades(2000)
  const balanceOps = allRows.filter(t => t.symbol === 'BALANCE')
  const [symbolFilter, setSymbol]  = useState('all')
  const [dirFilter,    setDir]     = useState('all')
  const [page,         setPage]    = useState(0)
  const [annotating,   setAnnotating] = useState<Trade | null>(null)

  const PAGE_SIZE = 10

  const filtered = trades.filter(t => {
    if (symbolFilter === 'XAUUSD' && !t.symbol?.includes('XAU'))  return false
    if (symbolFilter === 'NAS100' && !t.symbol?.includes('NAS') && !t.symbol?.includes('US100')) return false
    if (dirFilter    !== 'all'   && t.trade_type !== dirFilter)    return false
    return true
  })

  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const heatmap    = buildHeatmap(trades)
  const maxAbsPnl  = Math.max(1, ...( stats?.weeklyPnl.map(Math.abs) ?? [1]))

  // Best/worst setup from tags
  const tagStats = new Map<string, { wins: number; total: number }>()
  for (const t of trades) {
    for (const tag of t.tags ?? []) {
      const s = tagStats.get(tag) ?? { wins: 0, total: 0 }
      s.total++
      if ((t.net_profit ?? 0) > 0) s.wins++
      tagStats.set(tag, s)
    }
  }
  const tagArr = Array.from(tagStats.entries())
    .filter(([, s]) => s.total >= 3)
    .map(([tag, s]) => ({ tag, wr: s.wins / s.total, total: s.total }))
  const bestSetup  = tagArr.sort((a, b) => b.wr - a.wr)[0]
  const worstSetup = tagArr.sort((a, b) => a.wr - b.wr)[0]

  // Generate actual Mon-date labels for the last 7 weeks (oldest → newest)
  const weekLabels = Array.from({ length: 7 }, (_, i) => {
    const mondayOfWeek = new Date()
    const day = mondayOfWeek.getDay()
    // Go back to Monday of current week, then subtract (6 - i) weeks
    mondayOfWeek.setDate(mondayOfWeek.getDate() - (day === 0 ? 6 : day - 1) - (6 - i) * 7)
    return mondayOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Metrics with period selectors */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <PeriodMetricCard
          title="P&L"
          barColor="var(--gr)"
          getValue={(p) => {
            const t   = filterByPeriod(trades, p)
            const pnl = calcPnl(t)
            return { value: fmtPnl(pnl), change: `${t.length} trade${t.length !== 1 ? 's' : ''}`, changePositive: pnl >= 0 ? true : false }
          }}
        />
        <PeriodMetricCard
          title="Win Rate"
          barColor="var(--ac)"
          getValue={(p) => {
            const { rate, wins, losses, breakeven, total } = calcWinRate(filterByPeriod(trades, p))
            const label = breakeven > 0 ? `${wins}W · ${breakeven}BE · ${losses}L` : `${wins}W · ${losses}L`
            return { value: total > 0 ? `${rate.toFixed(1)}%` : '—', change: label, changePositive: rate >= 50 ? true : rate === 0 ? null : false }
          }}
        />
        <PeriodMetricCard
          title="Avg R:R"
          barColor="var(--am)"
          getValue={(p) => {
            const rr = calcAvgRR(filterByPeriod(trades, p))
            return { value: rr > 0 ? rr.toFixed(2) : '—', change: rr > 0 ? (rr >= 1.5 ? 'Above target' : 'Below 1.5 target') : 'No SL/TP data', changePositive: rr >= 1.5 ? true : rr > 0 ? false : null }
          }}
        />
        <PeriodMetricCard
          title="Max Drawdown"
          barColor="var(--re)"
          getValue={(p) => {
            const dd = calcMaxDrawdown(filterByPeriod(trades, p))
            return { value: dd < 0 ? `€${Math.abs(dd).toFixed(2)}` : '€0.00', change: dd < 0 ? 'Worst single day' : 'No losing days', changePositive: dd === 0 ? true : false }
          }}
        />
        <PeriodMetricCard
          title="Withdrawn"
          barColor="var(--am)"
          getValue={(p) => {
            const ops = filterByPeriod(balanceOps, p)
            const withdrawn = ops
              .filter(t => (t.net_profit ?? 0) < 0)
              .reduce((s, t) => s + Math.abs(t.net_profit ?? 0), 0)
            const deposited = ops
              .filter(t => (t.net_profit ?? 0) > 0)
              .reduce((s, t) => s + (t.net_profit ?? 0), 0)
            const label = deposited > 0
              ? `+€${deposited.toFixed(2)} deposited`
              : ops.length === 0 ? 'No activity' : 'Trading profits only'
            return {
              value: withdrawn > 0 ? `€${withdrawn.toFixed(2)}` : '€0.00',
              change: label,
              changePositive: null,
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Trade Log */}
        <div className="lg:col-span-3">
          <Panel title={`Trade Log (${filtered.length})`} noPadding action={
            <div className="flex items-center gap-1.5 flex-wrap">
              {['all','XAUUSD','NAS100'].map(s => (
                <button key={s} onClick={() => { setSymbol(s); setPage(0) }}
                  style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'6px', border:'none', cursor:'pointer',
                    background: symbolFilter===s ? 'var(--ac)' : 'var(--s3)',
                    color:      symbolFilter===s ? 'white'     : 'var(--t2)' }}>
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
              <div style={{ width:'1px', height:'14px', background:'var(--bd2)' }}/>
              {['all','buy','sell'].map(d => (
                <button key={d} onClick={() => { setDir(d); setPage(0) }}
                  style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'6px', border:'none', cursor:'pointer',
                    background: dirFilter===d ? 'var(--ac)' : 'var(--s3)',
                    color:      dirFilter===d ? 'white'     : 'var(--t2)' }}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          }>
            {/* Header */}
            <div className="flex items-center px-4 py-2 gap-3"
              style={{ borderBottom:'1px solid var(--bd)', fontSize:'11px', color:'var(--t3)', letterSpacing:'0.04em' }}>
              <span style={{ minWidth:'80px' }}>PAIR</span>
              <span style={{ minWidth:'90px' }}>SESSION</span>
              <span className="flex-1">SETUP / NOTE</span>
              <span style={{ minWidth:'80px', textAlign:'right' }}>P&L (EUR)</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span style={{ color:'var(--t3)', fontSize:'13px' }}>Loading trades…</span>
              </div>
            ) : paginated.map((trade: Trade) => {
              const result = tradeResult(trade.net_profit ?? 0)
              const rowBg  = result === 'win'  ? 'rgba(99,153,34,0.07)'
                           : result === 'loss' ? 'rgba(226,75,74,0.07)'
                           : 'transparent'
              const hoverBg = result === 'win'  ? 'rgba(99,153,34,0.13)'
                            : result === 'loss' ? 'rgba(226,75,74,0.13)'
                            : 'var(--s3)'
              return (
              <div key={trade.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group"
                style={{ borderBottom:'1px solid var(--bd)', background: rowBg }}
                onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>

                <div className="flex flex-col gap-1" style={{ minWidth:'80px' }}>
                  <span style={{ color:'var(--t1)', fontWeight:500, fontSize:'13px' }}>{trade.symbol}</span>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant={trade.trade_type as 'buy'|'sell'}>{trade.trade_type.toUpperCase()}</Badge>
                    {trade.screenshot_missing && <Badge variant="screenshot">no screenshot</Badge>}
                  </div>
                </div>

                <div className="flex flex-col gap-1" style={{ minWidth:'90px' }}>
                  {trade.session && (
                    <Badge variant={trade.session as never}>
                      {trade.session === 'new_york' ? 'NY' : trade.session.charAt(0).toUpperCase() + trade.session.slice(1)}
                    </Badge>
                  )}
                  <span style={{ color:'var(--t3)', fontSize:'11px' }}>
                    {fmtDate(trade.open_time)} · {fmtTime(trade.open_time)}
                  </span>
                </div>

                <div className="flex-1">
                  <span style={{ color:'var(--t2)', fontSize:'12px' }}>
                    {trade.setup_type ?? trade.notes ?? '—'}
                  </span>
                  {trade.emotion_pre && (
                    <span style={{ color:'var(--t3)', fontSize:'11px', marginLeft:'8px' }}>{trade.emotion_pre}</span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span className="num" style={{
                    color:      result === 'win' ? 'var(--gr2)' : result === 'loss' ? 'var(--re)' : 'var(--ac)',
                    fontWeight: 700,
                    fontSize:   '14px',
                    letterSpacing: '-0.02em',
                  }}>
                    {fmtPnl(trade.net_profit)}
                  </span>
                  <span style={{ color:'var(--t3)', fontSize:'11px' }}>{fmtPips(trade.pips)}</span>
                </div>

                {/* W / L / BE badge */}
                <span style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
                  padding: '2px 7px', borderRadius: '4px', flexShrink: 0,
                  background: result === 'win'  ? 'rgba(99,153,34,0.18)'
                            : result === 'loss' ? 'rgba(226,75,74,0.18)'
                            : 'rgba(88,166,255,0.12)',
                  color:      result === 'win'  ? 'var(--gr2)'
                            : result === 'loss' ? 'var(--re)'
                            : 'var(--ac)',
                }}>
                  {result === 'win' ? 'W' : result === 'loss' ? 'L' : 'BE'}
                </span>

                {/* Pencil — annotate */}
                <button
                  onClick={e => { e.stopPropagation(); setAnnotating(trade) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Annotate trade"
                  style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:'16px', padding:'2px 4px', lineHeight:1 }}>
                  ✎
                </button>
              </div>
            )})}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop:'1px solid var(--bd)' }}>
                <button disabled={page===0} onClick={() => setPage(p=>p-1)}
                  style={{ fontSize:'12px', color: page===0?'var(--t3)':'var(--ac)', background:'none', border:'none', cursor:page===0?'default':'pointer' }}>
                  ← Prev
                </button>
                <span style={{ color:'var(--t3)', fontSize:'12px' }}>{page+1} / {totalPages}</span>
                <button disabled={page>=totalPages-1} onClick={() => setPage(p=>p+1)}
                  style={{ fontSize:'12px', color: page>=totalPages-1?'var(--t3)':'var(--ac)', background:'none', border:'none', cursor:page>=totalPages-1?'default':'pointer' }}>
                  Next →
                </button>
              </div>
            )}
          </Panel>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Panel title="Performance Stats">
            <div className="flex flex-col gap-3">
              <div>
                <p style={{ color:'var(--t3)', fontSize:'11px', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Win Rate by Pair</p>
                {[
                  { label:'XAUUSD', wr: stats?.xauWinRate ?? 0, color:'var(--go2)' },
                  { label:'NAS100', wr: stats?.nasWinRate ?? 0, color:'var(--ac)'  },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 mb-2">
                    <span style={{ color:'var(--t2)', fontSize:'12px', minWidth:'56px' }}>{item.label}</span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height:'4px', background:'var(--s3)' }}>
                      <div style={{ width:`${item.wr}%`, height:'100%', background:item.color, borderRadius:'4px' }}/>
                    </div>
                    <span className="num" style={{ color:'var(--t1)', fontSize:'13px', fontWeight:700, minWidth:'40px', textAlign:'right' }}>{item.wr.toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              <div style={{ height:'1px', background:'var(--bd)' }}/>

              <div>
                <p style={{ color:'var(--t3)', fontSize:'11px', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Win Rate by Session</p>
                {[
                  { label:'London',   wr: stats?.londonWinRate ?? 0, color:'var(--ac)'  },
                  { label:'New York', wr: stats?.nyWinRate     ?? 0, color:'var(--am2)' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 mb-2">
                    <span style={{ color:'var(--t2)', fontSize:'12px', minWidth:'64px' }}>{item.label}</span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height:'4px', background:'var(--s3)' }}>
                      <div style={{ width:`${item.wr}%`, height:'100%', background:item.color, borderRadius:'4px' }}/>
                    </div>
                    <span className="num" style={{ color:'var(--t1)', fontSize:'13px', fontWeight:700, minWidth:'40px', textAlign:'right' }}>{item.wr.toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              <div style={{ height:'1px', background:'var(--bd)' }}/>

              <div className="flex flex-col gap-2">
                {bestSetup && (
                  <div className="flex items-start justify-between">
                    <span style={{ color:'var(--t3)', fontSize:'11px' }}>Best tag</span>
                    <div className="text-right">
                      <p style={{ color:'var(--gr2)', fontSize:'12px', fontWeight:500 }}>#{bestSetup.tag}</p>
                      <p style={{ color:'var(--t3)', fontSize:'11px' }}>{(bestSetup.wr*100).toFixed(0)}% win · {bestSetup.total} trades</p>
                    </div>
                  </div>
                )}
                {worstSetup && worstSetup.tag !== bestSetup?.tag && (
                  <div className="flex items-start justify-between">
                    <span style={{ color:'var(--t3)', fontSize:'11px' }}>Worst tag</span>
                    <div className="text-right">
                      <p style={{ color:'var(--re)', fontSize:'12px', fontWeight:500 }}>#{worstSetup.tag}</p>
                      <p style={{ color:'var(--t3)', fontSize:'11px' }}>{(worstSetup.wr*100).toFixed(0)}% win · {worstSetup.total} trades</p>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ height:'1px', background:'var(--bd)' }}/>

              {/* Weekly P&L — bidirectional bar chart */}
              <div>
                <p style={{ color:'var(--t3)', fontSize:'11px', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Last 7 Weeks P&L</p>
                {/* Chart area: 40px above zero + 40px below zero */}
                <div style={{ position:'relative', height:'88px' }}>
                  {/* Zero line */}
                  <div style={{
                    position:'absolute', top:'50%', left:0, right:0,
                    height:'1px', background:'var(--bd2)', zIndex:1,
                  }} />
                  <div className="flex items-stretch gap-1" style={{ height:'100%' }}>
                    {(stats?.weeklyPnl ?? Array(7).fill(0)).map((pnl, i) => {
                      const pct  = Math.abs(pnl) / maxAbsPnl           // 0–1
                      const barH = Math.max(3, pct * 40)               // max 40px each side
                      const isPos = pnl >= 0
                      const color = isPos ? 'var(--gr2)' : 'var(--re)'
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-center" style={{ gap:0 }}
                          title={`${weekLabels[i]}: ${pnl >= 0 ? '+' : ''}€${pnl.toFixed(2)}`}>
                          {/* Upper half */}
                          <div style={{ height:'40px', display:'flex', alignItems:'flex-end', width:'100%' }}>
                            {isPos && (
                              <div style={{
                                width:'100%', height:`${barH}px`,
                                background: color, borderRadius:'3px 3px 0 0',
                                opacity: 0.85,
                              }} />
                            )}
                          </div>
                          {/* Lower half */}
                          <div style={{ height:'40px', display:'flex', alignItems:'flex-start', width:'100%' }}>
                            {!isPos && (
                              <div style={{
                                width:'100%', height:`${barH}px`,
                                background: color, borderRadius:'0 0 3px 3px',
                                opacity: 0.85,
                              }} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Week date labels */}
                <div className="flex gap-1" style={{ marginTop:'6px' }}>
                  {weekLabels.map((label, i) => (
                    <div key={i} className="flex-1 text-center">
                      <span style={{ fontSize:'9px', color:'var(--t3)', whiteSpace:'nowrap' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Trade Annotation Modal */}
      {annotating && (
        <TradeAnnotationModal
          trade={annotating}
          onClose={() => setAnnotating(null)}
        />
      )}

      {/* Statistical Analysis — full analytics panel */}
      <TradingInsights trades={trades} allRows={allRows} />
      <JarvisChat trades={trades} />

      {/* Session Heatmap — kept for visual quick reference */}
      <Panel title="Session Heatmap — Win Rate (from your real trades)">
        <div className="flex flex-col gap-2">
          {['London','Overlap','NY'].map(session => (
            <div key={session} className="flex items-center gap-2">
              <span style={{ color:'var(--t2)', fontSize:'12px', minWidth:'56px' }}>{session}</span>
              <div className="flex gap-1.5 flex-1">
                {heatmap.filter(h => h.session === session).map(h => {
                  const c = heatColor(h.winRate, h.trades)
                  return (
                    <div key={h.day}
                      className="flex-1 flex flex-col items-center justify-center rounded-md py-2 gap-0.5"
                      style={{ background:c.bg, minHeight:'52px' }}
                      title={`${session} ${h.day}: ${Math.round(h.winRate*100)}% (${h.trades} trades)`}>
                      <span style={{ fontSize:'11px', color:'var(--t3)' }}>{h.day}</span>
                      {h.trades > 0 ? (
                        <>
                          <span style={{ fontSize:'13px', fontWeight:500, color:c.color }}>{Math.round(h.winRate*100)}%</span>
                          <span style={{ fontSize:'10px', color:'var(--t3)' }}>{h.trades}t</span>
                        </>
                      ) : (
                        <span style={{ fontSize:'11px', color:'var(--t3)' }}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
