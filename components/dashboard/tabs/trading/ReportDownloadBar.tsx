'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/vq'
import Icon from '@/components/ui/Icon'
import { monthBounds } from '@/lib/dates'

// ── Report download bar ───────────────────────────────────────────────────────

export function ReportDownloadBar() {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [showCustom,  setShowCustom]  = useState(false)
  const [customFrom,  setCustomFrom]  = useState('')
  const [customTo,    setCustomTo]    = useState('')

  async function download(label: string, from: string, to: string, period: 'weekly' | 'monthly') {
    if (!from || !to) return
    setDownloading(label)
    try {
      const res = await fetch(`/api/reports?period=${period}&from=${from}&to=${to}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        alert(`Report failed: ${err.error}`)
        return
      }
      const blob    = await res.blob()
      const link    = document.createElement('a')
      link.href     = URL.createObjectURL(blob)
      link.download = `velquor-report-${from}-to-${to}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    } finally {
      setDownloading(null)
    }
  }

  // These were formatted with toISOString, which converts to UTC first. Built
  // at local midnight, that rolls back a day for anyone east of Greenwich: on
  // 1 August in Vienna, "Last Month" asked for 30 June to 30 July — missing the
  // last day of July and including a day of June.
  const now  = new Date()
  const thisM = monthBounds(now, 0)
  const lastM = monthBounds(now, -1)

  const presets = [
    { label: 'This Month', from: thisM.from, to: thisM.to, period: 'monthly' as const },
    { label: 'Last Month', from: lastM.from, to: lastM.to, period: 'monthly' as const },
    { label: 'Last Year',  from: `${now.getFullYear() - 1}-01-01`, to: `${now.getFullYear() - 1}-12-31`, period: 'monthly' as const },
  ]

  const inputStyle: React.CSSProperties = {
    background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: 'var(--radius-md)',
    color: 'var(--t1)', fontSize: 'var(--text-base)', padding: '5px 8px', outline: 'none',
    colorScheme: 'dark',
  }

  const BtnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer', transition: 'all 0.12s',
  }

  return (
    <div style={{
      borderRadius: 'var(--radius-md)', background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
      overflow: 'hidden',
    }}>
      {/* ── Main bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '10px 14px' }}>
        {/* Icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '4px' }}>
          <Label>PDF report</Label>
        </div>

        {/* Presets */}
        {presets.map(r => {
          const busy = downloading === r.label
          return (
            <button
              key={r.label}
              onClick={() => download(r.label, r.from, r.to, r.period)}
              disabled={!!downloading}
              style={{
                ...BtnBase,
                background: busy ? 'var(--color-surface-3)' : 'transparent',
                color:      busy ? 'var(--color-ink-1)' : 'var(--color-ink-2)',
                border:     '1px solid var(--color-line-1)',
                opacity:    downloading && !busy ? 0.45 : 1,
              }}
              onMouseEnter={e => { if (!downloading) { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' } }}
              onMouseLeave={e => { if (!downloading) { e.currentTarget.style.background = busy ? 'var(--color-surface-3)' : 'transparent'; e.currentTarget.style.color = busy ? 'var(--color-ink-1)' : 'var(--color-ink-2)' } }}
            >
              {busy
                ? <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1px solid var(--color-line-2)', borderTopColor: 'var(--color-ink-1)', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                : <span style={{ opacity: 0.6, display: 'inline-flex' }}><Icon name="download" size={12} /></span>
              }
              {r.label}
            </button>
          )
        })}

        {/* Custom button */}
        <button
          onClick={() => setShowCustom(v => !v)}
          style={{
            ...BtnBase,
            background: showCustom ? 'var(--color-surface-3)' : 'transparent',
            color:      showCustom ? 'var(--color-ink-1)' : 'var(--color-ink-2)',
            border:     '1px solid var(--color-line-1)',
            marginLeft: 'auto',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = showCustom ? 'var(--color-surface-3)' : 'transparent'; e.currentTarget.style.color = showCustom ? 'var(--color-ink-1)' : 'var(--color-ink-2)' }}
        >
          <span style={{ fontSize: 'var(--text-sm)' }}>⊞</span>
          Custom range
        </button>
      </div>

      {/* ── Custom date picker (expands below) ── */}
      {showCustom && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          padding: '12px 14px',
          borderTop: '1px solid var(--color-line-1)',
          background: 'var(--color-surface-1)',
          animation: 'fade-in 0.15s ease',
        }}>
          <Label>From</Label>
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            style={inputStyle}
          />
          <Label>to</Label>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={() => {
              if (customFrom && customTo) {
                download('custom', customFrom, customTo, 'monthly')
                setShowCustom(false)
              }
            }}
            disabled={!customFrom || !customTo || !!downloading}
            style={{
              ...BtnBase,
              background: customFrom && customTo ? 'var(--color-ink-1)' : 'var(--color-surface-2)',
              color:       customFrom && customTo ? 'var(--color-void)' : 'var(--color-ink-3)',
              border:      '1px solid transparent',
              opacity:     !customFrom || !customTo ? 0.5 : 1,
            }}
          >
            {downloading === 'custom'
              ? <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1px solid var(--color-line-2)', borderTopColor: 'var(--color-ink-1)', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              : <span style={{ display: 'inline-flex' }}><Icon name="download" size={12} /></span>
            }
            Download
          </button>
        </div>
      )}
    </div>
  )
}
