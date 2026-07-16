'use client'

import { useEffect, useState } from 'react'
import Panel from '@/components/ui/Panel'
import { TraderDnaVisual, type DnaShape } from '@/components/TraderDnaVisual'

interface DnaResponse {
  tier: string
  aiCoaching: boolean
  dna: DnaShape & { sampleSize: number }
  focus: string
  ready: boolean
}

// Live Trader DNA card — computes the behavioral profile from the user's own
// trades. Scores show for everyone; the AI focus is Pro/Ultra.
export function TraderDnaCard() {
  const [data, setData]     = useState<DnaResponse | null>(null)
  const [loading, setLoad]  = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/velquor/dna')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) { setData(d); setLoad(false) } })
      .catch(() => { if (alive) setLoad(false) })
    return () => { alive = false }
  }, [])

  return (
    <Panel title="Trader DNA">
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>Reading your DNA…</div>
      ) : !data || !data.ready ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>
          Trader DNA unlocks after <strong style={{ color: 'var(--t1)' }}>10 closed trades</strong>.
          {data ? ` You have ${data.dna.sampleSize}.` : ''} Keep trading — it sharpens with every one.
        </div>
      ) : (
        <div style={{ padding: '4px 4px 8px' }}>
          <TraderDnaVisual dna={data.dna} focus={data.focus || undefined} />
          {!data.aiCoaching && (
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, textAlign: 'center',
              background: 'rgba(200,133,26,0.06)', border: '1px solid rgba(200,133,26,0.16)' }}>
              <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>
                Upgrade to <strong style={{ color: 'var(--go2, #C8851A)' }}>Pro</strong> for your AI biggest-opportunity focus —
                the one change that moves the needle most.
              </span>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
