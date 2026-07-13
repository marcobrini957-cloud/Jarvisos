'use client'

import { useState } from 'react'
import { useJournalEntries } from '@/hooks/useJournalEntries'
import { tradeResult } from '@/hooks/useTrades'
import type { JournalEntry } from '@/types'
import { type Mood, MOOD_COLOR, MOODS } from './helpers'

// ── Add / Edit Entry Modal ────────────────────────────────────────────────────

export function EntryModal({
  date,
  existing,
  dayTrades,
  onSave,
  onDelete,
  onClose,
}: {
  date: string
  existing?: JournalEntry
  dayTrades: Array<{ symbol: string; net_profit: number | null; trade_type: string }>
  onSave: (data: Parameters<ReturnType<typeof useJournalEntries>['addEntry']>[0]) => Promise<unknown>
  onDelete?: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [mood, setMood]         = useState<Mood>((existing?.mood as Mood) ?? 'neutral')
  const [energy, setEnergy]     = useState(existing?.energy_level ?? 7)
  const [body, setBody]         = useState(existing?.body_text ?? '')
  const [trading, setTrading]   = useState(existing?.is_trading_day ?? true)
  const [tagInput, setTagInput] = useState((existing?.tags ?? []).join(', '))
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  async function handleSave() {
    setSaving(true)
    await onSave({
      entry_date:     date,
      mood,
      energy_level:   energy,
      body_text:      body,
      is_trading_day: trading,
      tags:           tagInput.split(',').map(t => t.trim()).filter(Boolean),
    })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="modal-sheet fixed z-50 rounded-xl flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '520px', maxWidth: 'calc(100vw - 24px)', maxHeight: '90dvh',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '24px', overflowY: 'auto',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 500 }}>Journal Entry</h2>
            <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '2px' }}>{displayDate}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Mood selector */}
        <div>
          <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>How are you feeling?</p>
          <div className="flex gap-2">
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m)}
                className="flex-1 py-2 rounded-md capitalize transition-all"
                style={{
                  fontSize: '12px', border: `1.5px solid ${mood === m ? MOOD_COLOR[m] : 'var(--bd2)'}`,
                  background: mood === m ? `${MOOD_COLOR[m]}18` : 'var(--s2)',
                  color: mood === m ? MOOD_COLOR[m] : 'var(--t2)', cursor: 'pointer', fontWeight: mood === m ? 500 : 400,
                }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Energy level */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Energy Level</p>
            <span style={{ color: 'var(--go2)', fontSize: '14px', fontWeight: 500 }}>{energy}/10</span>
          </div>
          <input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(Number(e.target.value))}
            className="w-full" style={{ accentColor: 'var(--ac)' }} />
          <div className="flex justify-between mt-1">
            <span style={{ color: 'var(--t3)', fontSize: '10px' }}>Exhausted</span>
            <span style={{ color: 'var(--t3)', fontSize: '10px' }}>Peak</span>
          </div>
        </div>

        {/* Today's trades summary — auto-pulled */}
        {dayTrades.length > 0 && (() => {
          const dayPnl = dayTrades.reduce((s, t) => s + (t.net_profit ?? 0), 0)
          const wins   = dayTrades.filter(t => tradeResult(t.net_profit ?? 0) === 'win').length
          const losses = dayTrades.filter(t => tradeResult(t.net_profit ?? 0) === 'loss').length
          return (
            <div style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
                Today&apos;s Trades — auto-pulled
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ color: dayPnl >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {dayPnl >= 0 ? '+' : ''}€{dayPnl.toFixed(2)}
                  </p>
                  <p style={{ color: 'var(--t3)', fontSize: '10px' }}>{dayTrades.length} trades · {wins}W {losses}L</p>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {dayTrades.slice(0, 5).map((t, i) => {
                    const r = tradeResult(t.net_profit ?? 0)
                    const color = r === 'win' ? 'var(--gr2)' : r === 'loss' ? 'var(--re)' : 'var(--t3)'
                    return (
                      <span key={i} style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                        background: r === 'win' ? 'rgba(0,232,122,0.08)' : r === 'loss' ? 'rgba(255,61,80,0.08)' : 'var(--s3)',
                        color, border: `1px solid ${r === 'win' ? 'rgba(0,232,122,0.2)' : r === 'loss' ? 'rgba(255,61,80,0.2)' : 'var(--bd)'}`,
                        fontWeight: 500,
                      }}>
                        {t.symbol} {t.net_profit !== null ? `${t.net_profit >= 0 ? '+' : ''}€${t.net_profit.toFixed(0)}` : ''}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Text body */}
        <div>
          <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
            Journal Entry <span style={{ color: 'var(--t3)' }}>— how was your trading day? What did you feel?</span>
          </p>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            placeholder="Write freely — your setups, emotions, lessons learned, what you'd do differently…"
            style={{
              width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '8px',
              padding: '12px', color: 'var(--t1)', fontSize: '13px', lineHeight: '1.7',
              resize: 'vertical', outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
          />
        </div>

        {/* Tags + trading day */}
        <div className="flex gap-3">
          <div className="flex-1">
            <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Tags (comma separated)</p>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              placeholder="focused, disciplined, fomo…"
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '8px',
                padding: '10px 12px', color: 'var(--t1)', fontSize: '13px', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <p style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Trading day?</p>
            <button onClick={() => setTrading(t => !t)}
              className="px-4 py-2.5 rounded-md"
              style={{
                background: trading ? 'rgba(99,153,34,0.15)' : 'var(--s2)',
                border: `1.5px solid ${trading ? 'rgba(99,153,34,0.35)' : 'var(--bd2)'}`,
                color: trading ? 'var(--gr2)' : 'var(--t3)', fontSize: '12px', cursor: 'pointer',
              }}>
              {trading ? 'Yes ✓' : 'No'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {existing && onDelete && (
            confirmDelete ? (
              <>
                <button
                  onClick={async () => {
                    setDeleting(true)
                    await onDelete(existing.id)
                    onClose()
                  }}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-md font-medium"
                  style={{ background: 'var(--re)', border: 'none', color: 'white', fontSize: '13px', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="py-2.5 px-4 rounded-md"
                  style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="py-2.5 px-3 rounded-md"
                style={{ background: 'transparent', border: '1px solid rgba(255,51,71,0.25)', color: 'var(--re)', fontSize: '13px', cursor: 'pointer' }}>
                Delete
              </button>
            )
          )}
          {!confirmDelete && (
            <>
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-md"
                style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-md font-medium"
                style={{ background: saving ? 'rgba(99,153,34,0.3)' : 'var(--gr)', border: 'none', color: 'white', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : existing ? 'Update Entry' : '+ Save Entry'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
