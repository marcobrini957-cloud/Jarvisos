'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useTrades, tradeResult, BE_THRESHOLD } from '@/hooks/useTrades'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import { generateInsights }  from '@/lib/intelligence'
import InsightCard           from '@/components/ui/InsightCard'
import PeriodMetricCard, { type Period } from '@/components/ui/PeriodMetricCard'
import Panel                 from '@/components/ui/Panel'
import Badge                 from '@/components/ui/Badge'
import ScreenshotGallery     from '@/components/ui/ScreenshotGallery'
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
  const [aiFeedback,  setAiFeedback]  = useState<string | null>(null)
  const [aiFetching,  setAiFetching]  = useState(false)

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
      // Fetch AI feedback (non-blocking)
      setAiFetching(true)
      fetch('/api/jarvis/trade-feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tradeId:     trade.id,
          symbol:      trade.symbol,
          type:        trade.trade_type,
          pnl:         trade.net_profit ?? 0,
          setupType:   setupType || null,
          emotion:     emotion   || null,
          tags,
          followedPlan: followed,
          notes:        notes    || null,
        }),
      })
        .then(r => r.json())
        .then((d: { feedback?: string }) => { if (d.feedback) setAiFeedback(d.feedback) })
        .catch(() => { /* silently fail */ })
        .finally(() => setAiFetching(false))
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

        {/* AI Feedback */}
        {saved && (aiFetching || aiFeedback) && (
          <div style={{
            padding: '12px 14px', borderRadius: '8px',
            background: 'rgba(77,143,255,0.07)', border: '1px solid rgba(77,143,255,0.2)',
          }}>
            <p style={{ fontSize: '10px', color: 'var(--ac)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              Jarvis Feedback
            </p>
            {aiFetching ? (
              <p style={{ fontSize: '12px', color: 'var(--t3)' }}>Analyzing trade…</p>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.65 }}>{aiFeedback}</p>
            )}
          </div>
        )}
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
  const valid = trades.filter(t => t.stop_loss && t.open_price && t.close_price && t.trade_type)
  if (valid.length === 0) return 0
  const sum = valid.reduce((s, t) => {
    const dir      = t.trade_type === 'buy' ? 1 : -1
    const realized = dir * ((t.close_price ?? 0) - (t.open_price ?? 0))
    const risk     = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
    return s + (risk > 0 ? realized / risk : 0)
  }, 0)
  return sum / valid.length
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

// Month abbreviations — locale-independent, same output on Node.js and browser
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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

// ── Your Edge Panel ───────────────────────────────────────────────────────────

function YourEdge({ trades }: { trades: Trade[] }) {
  const closed = trades.filter(t => t.net_profit !== null && t.symbol !== 'BALANCE')
  if (closed.length < 10) return null

  type Edge = { label: string; value: string; sub: string; color: string; icon: string }
  const edges: Edge[] = []

  // Helper
  const wrOf = (ts: Trade[]) => {
    const w = ts.filter(t => (t.net_profit ?? 0) > BE_THRESHOLD).length
    const l = ts.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
    return (w + l) > 0 ? { wr: (w / (w + l)) * 100, trades: ts.length, w, l } : null
  }
  const avgPnl = (ts: Trade[]) => ts.reduce((s, t) => s + (t.net_profit ?? 0), 0) / (ts.length || 1)

  // Best day of week
  const byDay: Record<number, Trade[]> = {}
  for (const t of closed) {
    if (!t.close_time) continue
    const d = new Date(t.close_time).getDay()
    if (d === 0 || d === 6) continue
    ;(byDay[d] ??= []).push(t)
  }
  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  let bestDay = { wr: 0, day: '', avg: 0, n: 0 }
  for (const [d, ts] of Object.entries(byDay)) {
    const r = wrOf(ts)
    if (r && r.wr > bestDay.wr && r.trades >= 3) {
      bestDay = { wr: r.wr, day: dayNames[Number(d)], avg: avgPnl(ts), n: r.trades }
    }
  }
  if (bestDay.day) edges.push({
    label: `Best day: ${bestDay.day}`,
    value: `${bestDay.wr.toFixed(0)}% WR`,
    sub: `avg ${bestDay.avg >= 0 ? '+' : ''}€${bestDay.avg.toFixed(0)} · ${bestDay.n} trades`,
    color: 'var(--gr2)', icon: '📅',
  })

  // Best session
  const sessions = [
    { key: 'london',   label: 'London session' },
    { key: 'new_york', label: 'New York session' },
    { key: 'overlap',  label: 'London/NY overlap' },
  ]
  let bestSession = { wr: 0, label: '', avg: 0, n: 0 }
  for (const s of sessions) {
    const ts = closed.filter(t => t.session === s.key)
    const r = wrOf(ts)
    if (r && r.wr > bestSession.wr && r.trades >= 3) {
      bestSession = { wr: r.wr, label: s.label, avg: avgPnl(ts), n: r.trades }
    }
  }
  if (bestSession.label) edges.push({
    label: bestSession.label,
    value: `${bestSession.wr.toFixed(0)}% WR`,
    sub: `avg ${bestSession.avg >= 0 ? '+' : ''}€${bestSession.avg.toFixed(0)} · ${bestSession.n} trades`,
    color: 'var(--cy2)', icon: '⏰',
  })

  // Best instrument
  const instruments = [
    { keys: ['XAU'],           label: 'XAUUSD' },
    { keys: ['NAS', 'US100'],  label: 'NAS100' },
  ]
  let bestInst = { wr: 0, label: '', avg: 0, n: 0 }
  for (const inst of instruments) {
    const ts = closed.filter(t => inst.keys.some(k => t.symbol?.includes(k)))
    const r = wrOf(ts)
    if (r && r.wr > bestInst.wr && r.trades >= 3) {
      bestInst = { wr: r.wr, label: inst.label, avg: avgPnl(ts), n: r.trades }
    }
  }
  if (bestInst.label) edges.push({
    label: `Best instrument: ${bestInst.label}`,
    value: `${bestInst.wr.toFixed(0)}% WR`,
    sub: `avg ${bestInst.avg >= 0 ? '+' : ''}€${bestInst.avg.toFixed(0)} · ${bestInst.n} trades`,
    color: 'var(--go2)', icon: '📈',
  })

  // Plan adherence edge
  const withPlan    = closed.filter(t => t.followed_plan === true)
  const withoutPlan = closed.filter(t => t.followed_plan === false)
  if (withPlan.length >= 3 && withoutPlan.length >= 3) {
    const planPnl    = avgPnl(withPlan)
    const noPlanPnl  = avgPnl(withoutPlan)
    const diff       = planPnl - noPlanPnl
    if (Math.abs(diff) > 20) edges.push({
      label: diff > 0 ? 'Following your plan pays' : 'Breaking plan is costly',
      value: diff > 0 ? `+€${diff.toFixed(0)} avg` : `-€${Math.abs(diff).toFixed(0)} avg`,
      sub: `plan: €${planPnl.toFixed(0)} · no plan: €${noPlanPnl.toFixed(0)}`,
      color: diff > 0 ? 'var(--gr2)' : 'var(--re)',
      icon: diff > 0 ? '✅' : '🚫',
    })
  }

  // Loss streak warning
  let streak = 0
  for (const t of [...closed].reverse()) {
    if ((t.net_profit ?? 0) < -BE_THRESHOLD) streak++
    else if ((t.net_profit ?? 0) > BE_THRESHOLD) break
  }
  if (streak >= 3) edges.push({
    label: `${streak}-trade loss streak`,
    value: 'Take a break',
    sub: 'History shows WR drops 40% after 3 consecutive losses',
    color: 'var(--re)',
    icon: '🛑',
  })

  if (edges.length === 0) return null

  return (
    <Panel title="Your Edge — What the Data Says" accent="var(--cy)">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        {edges.map((e, i) => (
          <div key={i} style={{
            padding: '14px 16px', borderRadius: '10px',
            background: `${e.color}0D`,
            border: `1px solid ${e.color}28`,
            display: 'flex', flexDirection: 'column', gap: '5px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ fontSize: '16px' }}>{e.icon}</span>
              <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{e.label}</span>
            </div>
            <span style={{ fontSize: '22px', fontWeight: 700, color: e.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{e.value}</span>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{e.sub}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── Equity Curve ──────────────────────────────────────────────────────────────

type EqPeriod = 'all' | '1M' | '1W' | '1D'

function EquityCurve({ trades }: { trades: Trade[] }) {
  const [period, setPeriod] = useState<EqPeriod>('all')
  const [hover,  setHover]  = useState<{ idx: number; x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Full sorted history
  const chrono = useMemo(() =>
    trades
      .filter(t => t.net_profit !== null && t.symbol !== 'BALANCE')
      .sort((a, b) => (a.close_time ?? '').localeCompare(b.close_time ?? '')),
    [trades]
  )

  // Filter by selected period — calendar-aligned, not rolling windows
  const filtered = useMemo(() => {
    if (period === 'all') return chrono
    const now = new Date()
    let since: Date

    if (period === '1D') {
      // Current trading day: midnight local time (Vienna) today
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    } else if (period === '1W') {
      // Current trading week: Monday 00:00 → Friday (Mon–Fri aligned)
      const dow = now.getDay() // 0 = Sun … 6 = Sat
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      since.setDate(since.getDate() - (dow === 0 ? 6 : dow - 1))
    } else {
      // Current month: 1st of this month 00:00
      since = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    }

    return chrono.filter(t => t.close_time && new Date(t.close_time) >= since)
  }, [chrono, period])

  // Build sampled equity series (trade-by-trade, downsampled for "all" with many trades)
  const sampled = useMemo((): { v: number; date: string }[] => {
    if (filtered.length === 0) return []
    const step = Math.max(1, Math.ceil(filtered.length / 400))
    const out: { v: number; date: string }[] = []
    let running = 0
    for (let i = 0; i < filtered.length; i++) {
      running += filtered[i].net_profit ?? 0
      if (i % step === 0 || i === filtered.length - 1)
        out.push({ v: running, date: filtered[i].close_time ?? '' })
    }
    return out
  }, [filtered])

  if (chrono.length < 1) return null

  const equity  = sampled.map(s => s.v)
  const n       = equity.length
  const finalVal = n > 0 ? equity[n - 1] : 0

  // Peak + max drawdown
  let peak = 0, maxDD = 0, peakIdx = 0
  for (let i = 0; i < n; i++) {
    if (equity[i] > peak) { peak = equity[i]; peakIdx = i }
    const dd = peak - equity[i]
    if (dd > maxDD) maxDD = dd
  }

  const minVal  = Math.min(0, ...equity)
  const maxVal  = Math.max(0, ...equity)
  const range   = (maxVal - minVal) || 1

  // SVG geometry
  const W = 800, H = 220
  const PAD = { t: 24, r: 24, b: 32, l: 56 }
  const cW  = W - PAD.l - PAD.r
  const cH  = H - PAD.t - PAD.b

  const xOf   = (i: number) => PAD.l + (n > 1 ? i / (n - 1) : 0.5) * cW
  const yOf   = (v: number) => PAD.t + (1 - (v - minVal) / range) * cH
  const zeroY = yOf(0)

  const lineColor = finalVal >= 0 ? '#00E87A' : '#FF3D50'
  const fillColor = finalVal >= 0 ? '#00CC6A' : '#FF3D50'

  // n=1: draw a full-width horizontal reference line so a partial day always shows
  const linePath = n === 0 ? '' : n === 1
    ? `M${PAD.l},${yOf(equity[0]).toFixed(1)} L${(W - PAD.r)},${yOf(equity[0]).toFixed(1)}`
    : equity.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
  const areaPath = n === 0 ? '' : n === 1
    ? `M${PAD.l},${yOf(equity[0]).toFixed(1)} L${(W - PAD.r)},${yOf(equity[0]).toFixed(1)} L${(W - PAD.r)},${zeroY.toFixed(1)} L${PAD.l},${zeroY.toFixed(1)} Z`
    : `${linePath} L${xOf(n-1).toFixed(1)},${zeroY.toFixed(1)} L${xOf(0).toFixed(1)},${zeroY.toFixed(1)} Z`

  // Mouse interaction — maps screen coords → viewBox coords
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || n < 2) return  // hover only meaningful with 2+ points
    const rect = svg.getBoundingClientRect()
    const vbX  = ((e.clientX - rect.left) / rect.width) * W
    const frac = Math.max(0, Math.min(1, (vbX - PAD.l) / cW))
    const idx  = Math.round(frac * (n - 1))
    setHover({ idx, x: xOf(idx), y: yOf(equity[idx]) })
  }

  // Header: when hovering show that point's value; otherwise show period total
  const activeVal  = hover !== null ? sampled[hover.idx].v  : finalVal
  const activeDate = hover !== null ? sampled[hover.idx].date : null
  const activeD    = activeDate ? new Date(activeDate) : null
  const activeDateStr = activeD
    ? `${activeD.getUTCDate()} ${MON[activeD.getUTCMonth()]} ${activeD.getUTCFullYear()}`
    : ({ all: 'All-time', '1M': 'This month', '1W': 'This week', '1D': 'Today' } as const)[period]

  const periodLabel = ({ all: '', '1M': 'this month', '1W': 'this week', '1D': 'today' } as const)[period]

  return (
    <Panel
      title="Equity Curve"
      accent="var(--ac)"
      action={
        <div style={{ display: 'flex', gap: '3px' }}>
          {(['1D', '1W', '1M', 'all'] as EqPeriod[]).map(p => (
            <button key={p}
              onClick={() => { setPeriod(p); setHover(null) }}
              style={{
                padding: '3px 10px', borderRadius: '6px', border: 'none',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                background: period === p ? 'var(--ac)' : 'var(--s3)',
                color:      period === p ? 'white'     : 'var(--t3)',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (period !== p) e.currentTarget.style.color = 'var(--t2)' }}
              onMouseLeave={e => { if (period !== p) e.currentTarget.style.color = 'var(--t3)' }}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      }
    >
      {/* Stats header — reacts live to hover */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '12px', minHeight: '44px' }}>
        <div>
          <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em',
            textTransform: 'uppercase', marginBottom: '4px' }}>
            {activeDateStr}
          </p>
          <p style={{
            color: activeVal >= 0 ? 'var(--gr2)' : 'var(--re)',
            fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
            transition: 'color 0.1s',
          }}>
            {activeVal >= 0 ? '+' : '-'}€{Math.abs(activeVal).toFixed(2)}
          </p>
        </div>

        {n > 0 && (
          <div style={{ display: 'flex', gap: '20px', paddingBottom: '2px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em',
                textTransform: 'uppercase', marginBottom: '3px' }}>Peak</p>
              <p style={{ color: 'var(--am2)', fontSize: '14px', fontWeight: 600 }}>
                +€{Math.max(0, ...equity).toFixed(2)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em',
                textTransform: 'uppercase', marginBottom: '3px' }}>Max DD</p>
              <p style={{ color: maxDD > 0.01 ? 'var(--re)' : 'var(--t3)', fontSize: '14px', fontWeight: 600 }}>
                {maxDD > 0.01 ? `-€${maxDD.toFixed(2)}` : '€0.00'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.05em',
                textTransform: 'uppercase', marginBottom: '3px' }}>Trades</p>
              <p style={{ color: 'var(--t2)', fontSize: '14px', fontWeight: 600 }}>{filtered.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Empty state for filtered period */}
      {n === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px',
          background: 'var(--s2)', borderRadius: '10px', border: '1px dashed var(--bd2)',
        }}>
          <p style={{ color: 'var(--t3)', fontSize: '13px' }}>No closed trades {periodLabel}</p>
        </div>
      )}

      {/* SVG chart */}
      {n >= 1 && (
        <svg
          ref={svgRef}
          width="100%" viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={fillColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0.25, 0.5, 0.75].map(v => (
            <line key={v}
              x1={PAD.l} y1={PAD.t + v * cH} x2={W - PAD.r} y2={PAD.t + v * cH}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1"
            />
          ))}

          {/* Zero baseline */}
          <line x1={PAD.l} y1={zeroY} x2={W - PAD.r} y2={zeroY}
            stroke="rgba(255,255,255,0.10)" strokeWidth="1" />

          {/* Area fill */}
          <path d={areaPath} fill="url(#eqFill)" />

          {/* Peak reference (shown only when currently in drawdown) */}
          {maxDD > 0.01 && finalVal < peak && (
            <line
              x1={xOf(peakIdx)} y1={yOf(peak)} x2={xOf(n-1)} y2={yOf(peak)}
              stroke="#E09020" strokeWidth="1" strokeDasharray="4,3" opacity="0.4"
            />
          )}

          {/* Equity line */}
          <path d={linePath} fill="none" stroke={lineColor}
            strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Peak dot */}
          {peakIdx > 0 && peakIdx < n - 1 && (
            <circle cx={xOf(peakIdx)} cy={yOf(peak)} r="3.5"
              fill="#E09020" stroke="#000000" strokeWidth="1.5" />
          )}

          {/* Final dot (hidden when hovering over last point) */}
          {(hover === null || hover.idx !== n - 1) && (
            <circle cx={xOf(n-1)} cy={yOf(finalVal)} r="4.5"
              fill={lineColor} stroke="#000000" strokeWidth="2" />
          )}

          {/* Y-axis labels */}
          {[maxVal, 0, minVal].filter((v, i, a) => a.indexOf(v) === i).map((v, i) => (
            <text key={i} x={PAD.l - 8} y={yOf(v) + 4}
              textAnchor="end" fontSize="10" fill="rgba(104,129,168,0.55)" fontFamily="monospace">
              {v >= 0 ? `+${v.toFixed(0)}` : v.toFixed(0)}
            </text>
          ))}

          {/* ── Hover crosshair ───────────────────────────────────────────── */}
          {hover !== null && (() => {
            const val  = sampled[hover.idx].v
            const date = sampled[hover.idx].date
            const d    = date ? new Date(date) : null
            const dateStr = d
              ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
              : ''
            const valStr   = `${val >= 0 ? '+' : '-'}€${Math.abs(val).toFixed(2)}`
            const hColor   = val >= 0 ? '#00E87A' : '#FF3D50'
            const tipW     = 148
            const tipH     = 50
            const isRight  = hover.x > W - PAD.r - tipW - 20
            const tx = isRight ? hover.x - tipW - 12 : hover.x + 12
            const ty = Math.max(PAD.t, Math.min(hover.y - tipH / 2, H - PAD.b - tipH))

            return (
              <g>
                {/* Vertical line */}
                <line x1={hover.x} y1={PAD.t} x2={hover.x} y2={H - PAD.b}
                  stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                {/* Horizontal line */}
                <line x1={PAD.l} y1={hover.y} x2={W - PAD.r} y2={hover.y}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {/* Y-axis pill label */}
                <rect x={2} y={hover.y - 9} width={PAD.l - 6} height={18} rx="4" fill="#4D8FFF" />
                <text x={PAD.l - 9} y={hover.y + 4} textAnchor="end"
                  fontSize="9" fill="white" fontWeight="700" fontFamily="monospace">
                  {val >= 0 ? '+' : ''}{val.toFixed(0)}
                </text>

                {/* Ripple + dot */}
                <circle cx={hover.x} cy={hover.y} r="10" fill={hColor} opacity="0.1" />
                <circle cx={hover.x} cy={hover.y} r="5"  fill={hColor} stroke="#000000" strokeWidth="2" />

                {/* Tooltip card */}
                <rect x={tx} y={ty} width={tipW} height={tipH}
                  rx="7" fill="#111111" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
                />
                <text x={tx + 11} y={ty + 17} fontSize="10"
                  fill="rgba(104,129,168,0.8)" fontFamily="monospace">
                  {dateStr}
                </text>
                <text x={tx + 11} y={ty + 38} fontSize="16" fontWeight="700"
                  fill={hColor} fontFamily="monospace">
                  {valStr}
                </text>
              </g>
            )
          })()}
        </svg>
      )}

      {/* X-axis date labels */}
      {n >= 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px',
          paddingLeft: `${PAD.l}px`, paddingRight: `${PAD.r}px` }}>
          {[0, Math.floor((n - 1) / 2), n - 1].map(i => {
            const d = sampled[i]?.date ? new Date(sampled[i].date) : null
            return (
              <span key={i} style={{ fontSize: '9px', color: 'var(--t3)', fontFamily: 'monospace' }}>
                {d ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]}` : ''}
              </span>
            )
          })}
        </div>
      )}
    </Panel>
  )
}

// ── Position Size Calculator ───────────────────────────────────────────────────

function PositionSizeCalc() {
  const [instrument, setInstrument] = useState<'XAUUSD' | 'NAS100'>('XAUUSD')
  const [balance,    setBalance]    = useState('10000')
  const [riskMode,   setRiskMode]   = useState<'pct' | 'eur'>('pct')
  const [riskPct,    setRiskPct]    = useState('1')
  const [riskEurAmt, setRiskEurAmt] = useState('100')
  const [entry,      setEntry]      = useState('')
  const [sl,         setSl]         = useState('')

  // USD contract value per 1 standard lot per 1.0 price move
  // XAUUSD: 100 oz × $1/oz = $100/lot/pt
  // NAS100: $1/lot/pt (standard micro-like contract on MT5)
  const CONTRACT: Record<'XAUUSD' | 'NAS100', number> = { XAUUSD: 100, NAS100: 1 }
  const EURUSD = 1.085  // approximate; affects lot size slightly

  const bal     = parseFloat(balance)    || 0
  const entryV  = parseFloat(entry)      || 0
  const slV     = parseFloat(sl)         || 0
  const dist    = Math.abs(entryV - slV)

  const riskEur = riskMode === 'pct'
    ? bal * ((parseFloat(riskPct) || 0) / 100)
    : parseFloat(riskEurAmt) || 0

  const contractVal = CONTRACT[instrument]
  const lots        = dist > 0 ? (riskEur * EURUSD) / (dist * contractVal) : 0
  const lotsOut     = Math.max(0.01, Math.floor(lots * 100) / 100)
  const actualRiskE = dist > 0 ? (lotsOut * dist * contractVal) / EURUSD : 0

  const inputSt: React.CSSProperties = {
    background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '8px',
    padding: '8px 12px', color: 'var(--t1)', fontSize: '14px',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const focus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--ac)')
  const blur  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--bd2)')

  return (
    <Panel title="Position Size Calculator" accent="var(--go2)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Instrument */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['XAUUSD', 'NAS100'] as const).map(inst => (
            <button key={inst} onClick={() => setInstrument(inst)} style={{
              flex: 1, padding: '7px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: instrument === inst ? 'var(--ac)' : 'var(--s3)',
              color:      instrument === inst ? 'white'     : 'var(--t2)',
              fontSize: '12px', fontWeight: 600, transition: 'all 0.12s',
            }}>
              {inst}
            </button>
          ))}
        </div>

        {/* Balance + Risk */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ color: 'var(--t3)', fontSize: '11px', display: 'block', marginBottom: '5px' }}>Balance (€)</label>
            <input value={balance} onChange={e => setBalance(e.target.value)}
              style={inputSt} onFocus={focus} onBlur={blur} placeholder="10000" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <label style={{ color: 'var(--t3)', fontSize: '11px' }}>Risk</label>
              <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--bd2)' }}>
                {(['pct', 'eur'] as const).map(m => (
                  <button key={m} onClick={() => setRiskMode(m)} style={{
                    padding: '2px 8px', border: 'none', cursor: 'pointer', fontSize: '10px',
                    background: riskMode === m ? 'var(--ac)' : 'transparent',
                    color:      riskMode === m ? 'white'     : 'var(--t3)',
                  }}>
                    {m === 'pct' ? '%' : '€'}
                  </button>
                ))}
              </div>
            </div>
            {riskMode === 'pct' ? (
              <input value={riskPct} onChange={e => setRiskPct(e.target.value)}
                style={inputSt} onFocus={focus} onBlur={blur} placeholder="1.0" />
            ) : (
              <input value={riskEurAmt} onChange={e => setRiskEurAmt(e.target.value)}
                style={inputSt} onFocus={focus} onBlur={blur} placeholder="100" />
            )}
          </div>
        </div>

        {/* Entry + SL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ color: 'var(--t3)', fontSize: '11px', display: 'block', marginBottom: '5px' }}>Entry Price</label>
            <input value={entry} onChange={e => setEntry(e.target.value)}
              style={inputSt} onFocus={focus} onBlur={blur}
              placeholder={instrument === 'XAUUSD' ? '2350.00' : '19000'} />
          </div>
          <div>
            <label style={{ color: 'var(--t3)', fontSize: '11px', display: 'block', marginBottom: '5px' }}>Stop Loss</label>
            <input value={sl} onChange={e => setSl(e.target.value)}
              style={inputSt} onFocus={focus} onBlur={blur}
              placeholder={instrument === 'XAUUSD' ? '2340.00' : '18950'} />
          </div>
        </div>

        {/* Result */}
        {dist > 0 ? (
          <div style={{
            padding: '16px 18px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(255,176,48,0.09) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,176,48,0.22)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
              <span style={{ color: 'var(--t3)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lot Size</span>
              <span style={{ color: 'var(--go2)', fontSize: '34px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {lotsOut.toFixed(2)}
              </span>
              <span style={{ color: 'var(--t3)', fontSize: '13px' }}>lots</span>
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '2px', letterSpacing: '0.04em' }}>RISK AT SIZE</p>
                <p style={{ color: 'var(--re)', fontSize: '13px', fontWeight: 600 }}>−€{actualRiskE.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '2px', letterSpacing: '0.04em' }}>SL DISTANCE</p>
                <p style={{ color: 'var(--t2)', fontSize: '13px', fontWeight: 600 }}>
                  {dist.toFixed(instrument === 'XAUUSD' ? 2 : 0)} pts
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '2px', letterSpacing: '0.04em' }}>% OF BALANCE</p>
                <p style={{ color: bal > 0 && actualRiskE / bal > 0.02 ? 'var(--am2)' : 'var(--t2)', fontSize: '13px', fontWeight: 600 }}>
                  {bal > 0 ? ((actualRiskE / bal) * 100).toFixed(2) : '—'}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '14px', borderRadius: '8px', textAlign: 'center',
            background: 'var(--s2)', border: '1px dashed var(--bd2)',
          }}>
            <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Enter entry & stop loss to calculate lot size</p>
          </div>
        )}

        <p style={{ color: 'var(--t3)', fontSize: '10px', lineHeight: 1.5 }}>
          Approx. EURUSD 1.085 · XAUUSD $100/lot/pt · NAS100 $1/lot/pt
        </p>
      </div>
    </Panel>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TradingTab() {
  const { trades, allRows, openPositions, stats, loading } = useTrades(2000)
  const { snapshot } = useAccountSnapshot()
  const currentBalance = snapshot?.balance ?? 0
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
  // Manual format (not toLocaleDateString) — avoids Node.js / browser Intl divergence
  const weekLabels = Array.from({ length: 7 }, (_, i) => {
    const d   = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) - (6 - i) * 7)
    return `${d.getDate()} ${MON[d.getMonth()]}`
  })

  return (
    <div className="flex flex-col gap-4">

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <Panel title={
          <span className="flex items-center gap-2">
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--gr2)',
              boxShadow: '0 0 6px var(--gr)',
              display: 'inline-block',
              animation: 'pulse-dot 1.5s ease-in-out infinite',
            }} />
            Live Positions ({openPositions.length})
          </span>
        } noPadding>
          {openPositions.map(pos => {
            const unrealised = pos.net_profit ?? 0
            const isUp = unrealised >= 0
            return (
              <div key={pos.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--bd)' }}>
                <div className="flex flex-col gap-0.5" style={{ minWidth: '80px' }}>
                  <span style={{ color: 'var(--t1)', fontWeight: 600, fontSize: '13px' }}>{pos.symbol}</span>
                  <Badge variant={pos.trade_type as 'buy' | 'sell'}>{pos.trade_type.toUpperCase()}</Badge>
                </div>
                <div className="flex flex-col gap-0.5" style={{ minWidth: '80px' }}>
                  <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
                    {pos.lot_size} lot{(pos.lot_size ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
                    @ {pos.open_price}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 flex-1">
                  {pos.stop_loss && (
                    <span style={{ color: 'var(--re)', fontSize: '11px' }}>SL {pos.stop_loss}</span>
                  )}
                  {pos.take_profit && (
                    <span style={{ color: 'var(--gr2)', fontSize: '11px' }}>TP {pos.take_profit}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span style={{
                    color: isUp ? 'var(--gr2)' : 'var(--re)',
                    fontWeight: 700, fontSize: '14px', letterSpacing: '-0.02em',
                  }}>
                    {isUp ? '+' : '-'}€{Math.abs(unrealised).toFixed(2)}
                  </span>
                  <span style={{ color: 'var(--t3)', fontSize: '10px' }}>
                    {pos.open_time ? fmtDate(pos.open_time) + ' · ' + fmtTime(pos.open_time) : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </Panel>
      )}

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
          title="Real R:R"
          barColor="var(--am)"
          getValue={(p) => {
            const rr = calcAvgRR(filterByPeriod(trades, p))
            const hasData = trades.filter(t => t.stop_loss && t.open_price && t.close_price).length > 0
            return {
              value:          hasData ? rr.toFixed(2) : '—',
              change:         !hasData ? 'No SL data' : rr >= 1.5 ? 'Above target' : rr >= 0 ? 'Below 1.5 target' : 'Negative — cutting losses short',
              changePositive: !hasData ? null : rr >= 1.5 ? true : false,
            }
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

      {/* Equity Curve — capped so it doesn't stretch across a wide desktop */}
      <div style={{ maxWidth: '860px' }}>
        <EquityCurve trades={trades} />
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
            {/* Scrollable wrapper for tablet/mobile */}
            <div style={{ overflowX: 'auto' }}>
            {/* Header */}
            <div className="flex items-center px-4 py-2 gap-3"
              style={{ borderBottom:'1px solid var(--bd)', fontSize:'11px', color:'var(--t3)', letterSpacing:'0.04em', minWidth: '480px' }}>
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
                style={{ borderBottom:'1px solid var(--bd)', background: rowBg, minWidth: '480px' }}
                onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>

                <div className="flex flex-col gap-1" style={{ minWidth:'80px' }}>
                  <span style={{ color:'var(--t1)', fontWeight:500, fontSize:'13px' }}>{trade.symbol}</span>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant={trade.trade_type as 'buy'|'sell'}>{trade.trade_type.toUpperCase()}</Badge>
                    {trade.screenshot_missing && !trade.screenshot_open_url && !trade.screenshot_close_url && <Badge variant="screenshot">no screenshot</Badge>}
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
            </div>{/* end overflowX wrapper */}

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

        {/* Stats + Position Size */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Panel title="Performance Stats">
            <div className="flex flex-col gap-3">

              {/* Professional Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  {
                    label: 'Profit Factor',
                    value: !stats ? '—' : stats.profitFactor >= 99 ? '∞' : stats.profitFactor.toFixed(2),
                    color: !stats ? 'var(--t3)' : stats.profitFactor >= 1.5 ? 'var(--gr2)' : stats.profitFactor >= 1 ? 'var(--am2)' : 'var(--re)',
                    sub:   !stats ? '' : stats.profitFactor >= 1.5 ? 'Strong edge' : stats.profitFactor >= 1 ? 'Breakeven+' : 'Losing',
                  },
                  {
                    label: 'Expectancy',
                    value: !stats ? '—' : `${stats.expectancy >= 0 ? '+' : ''}€${stats.expectancy.toFixed(2)}`,
                    color: !stats ? 'var(--t3)' : stats.expectancy > 0 ? 'var(--gr2)' : 'var(--re)',
                    sub:   'per trade',
                  },
                  {
                    label: 'Avg Win',
                    value: !stats ? '—' : `€${stats.avgWin.toFixed(2)}`,
                    color: 'var(--gr2)',
                    sub:   `${stats?.maxConsecWins ?? 0} max streak`,
                  },
                  {
                    label: 'Avg Loss',
                    value: !stats ? '—' : `€${stats.avgLoss.toFixed(2)}`,
                    color: 'var(--re)',
                    sub:   `${stats?.maxConsecLosses ?? 0} max streak`,
                  },
                ].map(m => (
                  <div key={m.label} style={{
                    padding: '10px 12px', borderRadius: '8px',
                    background: 'var(--s2)', border: '1px solid var(--bd)',
                  }}>
                    <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '4px' }}>{m.label}</p>
                    <p style={{ color: m.color, fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '3px' }}>{m.value}</p>
                    <p style={{ color: 'var(--t3)', fontSize: '10px' }}>{m.sub}</p>
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: 'var(--bd)' }} />

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

          <PositionSizeCalc />
        </div>
      </div>

      {/* Trade Annotation Modal */}
      {annotating && (
        <TradeAnnotationModal
          trade={annotating}
          onClose={() => setAnnotating(null)}
        />
      )}

      {/* Your Edge */}
      <YourEdge trades={trades} />

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

      {/* Screenshot Gallery */}
      <Panel title={`Screenshot Gallery (${trades.filter(t => t.screenshot_open_url).length})`} accent="var(--cy2)">
        <ScreenshotGallery trades={trades} />
      </Panel>

    </div>
  )
}
