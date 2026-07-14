'use client'
import { useCallback, useEffect, useState } from 'react'
import { MONO, G, R, B, GO, P, Card, SchemaBanner, fmtDate } from '../ui'

type Entry = {
  id: string
  action: string
  target_user_id: string | null
  target_email: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

const ACTION_COLOR: Record<string, string> = {
  ban_user: R, unban_user: G, set_tier_user: GO,
  reset_api_key_user: B, set_note_user: 'rgba(255,255,255,0.4)',
  update_bridge_settings: P,
}

export function AuditTab() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [schemaPending, setSchemaPending] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/dev/audit', { cache: 'no-store' })
    if (res.ok) {
      const d = await res.json()
      setEntries(d.entries ?? [])
      setSchemaPending(!!d.schemaPending)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <>
      {schemaPending && <SchemaBanner />}
      <Card title={`Audit Log (last ${entries.length})`}>
        {entries.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontFamily: MONO }}>
            {schemaPending ? 'Waiting for migration…' : 'No admin actions logged yet.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {entries.map(e => {
              const color = ACTION_COLOR[e.action] ?? 'rgba(255,255,255,0.4)'
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', fontFamily: MONO }}>
                  <span style={{ color, fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', minWidth: '170px' }}>{e.action.replaceAll('_', ' ')}</span>
                  <span style={{ flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.target_email ?? e.target_user_id ?? '—'}
                    {e.detail && Object.keys(e.detail).length > 0 && (
                      <span style={{ color: 'rgba(255,255,255,0.25)' }}> · {JSON.stringify(e.detail)}</span>
                    )}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', whiteSpace: 'nowrap' }}>{fmtDate(e.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}
