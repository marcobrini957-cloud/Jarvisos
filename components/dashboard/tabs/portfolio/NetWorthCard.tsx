'use client'

import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import { fmtEur } from './helpers'

// Total Net Worth = MT5 trading equity (latest snapshot) + investment holdings.
// The one number that answers "how much money do I actually have".
export function NetWorthCard({ holdingsValueEur, holdingsLoading }: {
  holdingsValueEur: number
  holdingsLoading: boolean
}) {
  const { snapshot, loading: snapLoading } = useAccountSnapshot()

  const tradingEur = snapshot?.equity ?? snapshot?.balance ?? 0
  const loading    = snapLoading || holdingsLoading
  const total      = tradingEur + holdingsValueEur

  const tradingPct  = total > 0 ? (tradingEur / total) * 100 : 0
  const holdingsPct = total > 0 ? 100 - tradingPct : 0

  const rows = [
    { label: 'Trading accounts', sub: snapshot ? 'MT5 equity, live' : 'Connect MT5 to include', value: tradingEur, color: 'var(--ac)', pct: tradingPct },
    { label: 'Investments', sub: 'Stocks · ETFs · Metals', value: holdingsValueEur, color: 'var(--go2)', pct: holdingsPct },
  ]

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--s1) 0%, var(--s2) 100%)',
      border: '1px solid var(--bd)', borderRadius: '14px',
      padding: 'clamp(20px, 3vw, 28px)',
    }}>
      {/* corner glow */}
      <div style={{
        position: 'absolute', top: '-40%', right: '-10%', width: '55%', height: '160%',
        background: 'radial-gradient(ellipse, rgba(77,143,255,0.07), transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between" style={{ gap: '20px', position: 'relative' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Total Net Worth
          </p>
          <p style={{ margin: '8px 0 0', color: 'var(--t1)', fontSize: 'clamp(30px, 4.5vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {loading ? '—' : fmtEur(total)}
          </p>
          <p style={{ margin: '8px 0 0', color: 'var(--t3)', fontSize: '12px' }}>
            Everything you own, in one number — trading capital plus long-term assets.
          </p>
        </div>

        <div style={{ minWidth: 'min(300px, 100%)' }}>
          {rows.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '7px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '2px', background: r.color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12.5px', fontWeight: 600 }}>{r.label}</p>
                  <p style={{ margin: 0, color: 'var(--t3)', fontSize: '10.5px' }}>{r.sub}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, color: 'var(--t1)', fontSize: '14px', fontWeight: 700 }}>{loading ? '—' : fmtEur(r.value)}</p>
                <p style={{ margin: 0, color: 'var(--t3)', fontSize: '10.5px' }}>{loading ? '' : `${r.pct.toFixed(0)}%`}</p>
              </div>
            </div>
          ))}

          {/* allocation bar */}
          <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '6px', background: 'var(--s3)' }}>
            {!loading && total > 0 && (
              <>
                <div style={{ width: `${tradingPct}%`, background: 'var(--ac)', transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
                <div style={{ width: `${holdingsPct}%`, background: 'var(--go2)', transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
