'use client'

import { useEffect, useState } from 'react'
import { Card, Btn, MONO, G, R, GO, B, fmtDate } from '../ui'

/**
 * What the beta is actually telling us.
 *
 * Ordered newest first and defaulted to the open reports, because the only
 * question that matters between sessions is "what is broken that I have not
 * looked at yet".
 */

interface Report {
  id:          string
  created_at:  string
  kind:        'bug' | 'idea' | 'confusing' | 'praise'
  message:     string
  tab:         string | null
  path:        string | null
  viewport:    string | null
  user_agent:  string | null
  app_version: string | null
  status:      'new' | 'triaged' | 'done' | 'wontfix'
  admin_note:  string | null
  email:       string
}

const KIND_COLOR: Record<Report['kind'], string> = {
  bug: R, confusing: GO, idea: B, praise: G,
}

const STATUSES: Report['status'][] = ['new', 'triaged', 'done', 'wontfix']

export function FeedbackTab() {
  const [rows,    setRows]    = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  async function load() {
    try {
      const r = await fetch('/api/dev/feedback')
      if (r.ok) setRows(await r.json())
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function setStatus(id: string, status: Report['status']) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, status } : r)))
    await fetch('/api/dev/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
  }

  const open = rows.filter(r => r.status === 'new' || r.status === 'triaged')
  const shown = showAll ? rows : open

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px' }}>
        <Mini label="Open"    value={open.length} color={open.length ? GO : G} />
        <Mini label="Broken"  value={rows.filter(r => r.kind === 'bug' && r.status !== 'done' && r.status !== 'wontfix').length} color={R} />
        <Mini label="All time" value={rows.length} />
      </div>

      <Card
        title={showAll ? `All reports — ${rows.length}` : `Open reports — ${open.length}`}
        right={
          <span style={{ display: 'flex', gap: '6px' }}>
            <Btn small color={B} onClick={() => setShowAll(v => !v)}>{showAll ? 'Open only' : 'Show all'}</Btn>
            <Btn small color={B} onClick={load}>Refresh</Btn>
          </span>
        }
      >
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: MONO }}>Loading…</div>
        ) : shown.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: MONO }}>
            {rows.length === 0
              ? 'Nothing yet. The Feedback button sits bottom-right of the dashboard.'
              : 'Nothing open — everything has been triaged.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shown.map(r => (
              <div key={r.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `2px solid ${KIND_COLOR[r.kind]}`,
                borderRadius: '8px', padding: '12px 14px',
                opacity: r.status === 'done' || r.status === 'wontfix' ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ color: KIND_COLOR[r.kind], fontFamily: MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {r.kind}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontFamily: MONO, fontSize: '11px' }}>{r.email}</span>
                  <span style={{ color: 'rgba(255,255,255,0.28)', fontFamily: MONO, fontSize: '10px' }}>
                    {fmtDate(r.created_at)}
                  </span>
                </div>

                <p style={{
                  margin: '0 0 10px', color: '#fff', fontFamily: MONO, fontSize: '12px',
                  lineHeight: 1.65, whiteSpace: 'pre-wrap',
                }}>
                  {r.message}
                </p>

                <div style={{ color: 'rgba(255,255,255,0.28)', fontFamily: MONO, fontSize: '10px', marginBottom: '10px' }}>
                  {[
                    r.tab && `on ${r.tab}`,
                    r.viewport && `${r.viewport}${Number(r.viewport.split('x')[0]) < 768 ? ' (mobile)' : ''}`,
                    r.app_version && `build ${r.app_version}`,
                  ].filter(Boolean).join('  ·  ') || 'no context captured'}
                </div>

                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(r.id, s)}
                      style={{
                        background: r.status === s ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: `1px solid ${r.status === s ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '6px', padding: '3px 9px',
                        color: r.status === s ? '#fff' : 'rgba(255,255,255,0.4)',
                        fontFamily: MONO, fontSize: '10px', cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Mini({ label, value, color = '#fff' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: MONO }}>{label}</div>
      <div style={{ color, fontSize: '24px', fontWeight: 900, lineHeight: 1, fontFamily: MONO }}>{value}</div>
    </div>
  )
}
