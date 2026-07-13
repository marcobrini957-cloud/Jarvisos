'use client'

import { useState } from 'react'

// ── Report download bar ───────────────────────────────────────────────────────

function toYMD(d: Date) { return d.toISOString().split('T')[0] }

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

  const now     = new Date()
  const m1Start = new Date(now.getFullYear(), now.getMonth(), 1)
  const m1End   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const m2Start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const m2End   = new Date(now.getFullYear(), now.getMonth(), 0)

  const presets = [
    { label: 'This Month', from: toYMD(m1Start), to: toYMD(m1End),   period: 'monthly' as const },
    { label: 'Last Month', from: toYMD(m2Start), to: toYMD(m2End),   period: 'monthly' as const },
    { label: 'Last Year',  from: `${now.getFullYear() - 1}-01-01`, to: `${now.getFullYear() - 1}-12-31`, period: 'monthly' as const },
  ]

  const inputStyle: React.CSSProperties = {
    background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '6px',
    color: 'var(--t1)', fontSize: '12px', padding: '5px 8px', outline: 'none',
    colorScheme: 'dark',
  }

  const BtnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '5px 13px', borderRadius: '6px', fontSize: '12px',
    cursor: 'pointer', transition: 'all 0.12s', fontWeight: 500,
  }

  return (
    <div style={{
      borderRadius: '10px', background: 'var(--s1)', border: '1px solid var(--bd2)',
      overflow: 'hidden',
    }}>
      {/* ── Main bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '10px 14px' }}>
        {/* Icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px' }}>
          <span style={{ fontSize: '13px' }}>📄</span>
          <span style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.06em' }}>PDF REPORT</span>
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
                background: busy ? 'var(--ac)' : 'var(--s2)',
                color:      busy ? '#fff'       : 'var(--t2)',
                border:     `1px solid ${busy ? 'var(--ac)' : 'var(--bd2)'}`,
                opacity:    downloading && !busy ? 0.45 : 1,
              }}
              onMouseEnter={e => { if (!downloading) { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' } }}
              onMouseLeave={e => { if (!downloading) { e.currentTarget.style.background = busy ? 'var(--ac)' : 'var(--s2)'; e.currentTarget.style.color = busy ? '#fff' : 'var(--t2)' } }}
            >
              {busy
                ? <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                : <span style={{ fontSize: '11px', opacity: 0.6 }}>↓</span>
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
            background: showCustom ? 'rgba(77,143,255,0.12)' : 'var(--s2)',
            color:      showCustom ? 'var(--ac)'              : 'var(--t2)',
            border:     `1px solid ${showCustom ? 'var(--ac)' : 'var(--bd2)'}`,
            marginLeft: 'auto',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = showCustom ? 'rgba(77,143,255,0.12)' : 'var(--s2)'; e.currentTarget.style.color = showCustom ? 'var(--ac)' : 'var(--t2)' }}
        >
          <span style={{ fontSize: '11px' }}>⊞</span>
          Custom range
        </button>
      </div>

      {/* ── Custom date picker (expands below) ── */}
      {showCustom && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          padding: '12px 14px',
          borderTop: '1px solid var(--bd)',
          background: 'var(--s2)',
          animation: 'fade-in 0.15s ease',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>From</span>
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            style={inputStyle}
          />
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>to</span>
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
              background: customFrom && customTo ? 'var(--ac)' : 'var(--s3)',
              color:       customFrom && customTo ? '#fff'       : 'var(--t3)',
              border:      '1px solid transparent',
              opacity:     !customFrom || !customTo ? 0.5 : 1,
            }}
          >
            {downloading === 'custom'
              ? <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              : <span style={{ fontSize: '11px' }}>↓</span>
            }
            Download
          </button>
        </div>
      )}
    </div>
  )
}
