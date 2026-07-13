'use client'

import { useState } from 'react'
import { tradeResult } from '@/hooks/useTrades'
import Badge from '@/components/ui/Badge'
import type { Trade } from '@/types'

// ── Trade Annotation Modal ─────────────────────────────────────────────────────

const SETUP_TYPES = ['ICT Order Block', 'BOS / CHoCH', 'Fair Value Gap', 'Liquidity Grab', 'Support / Resistance', 'Trend Follow', 'Scalp', 'Other']
const MISTAKE_TAGS = ['FOMO', 'Revenge trade', 'Early exit', 'Late entry', 'Oversize', 'No SL', 'News blindspot', 'Emotional']

export function TradeAnnotationModal({ trade, onClose }: { trade: Trade; onClose: () => void }) {
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
      fetch('/api/velquor/trade-feedback', {
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
      <div className="modal-sheet fixed z-50 rounded-xl flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '520px', maxWidth: 'calc(100vw - 24px)', maxHeight: '90dvh',
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
              VELQUOR Feedback
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
