'use client'

import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import { Label, Num } from '@/components/ui/vq'
import { ownCapital, hasCredit } from '@/lib/trading/capital'
import { fmtEur } from './helpers'

// Total Net Worth = the trader's own MT5 capital (latest snapshot) + investment
// holdings. The one number that answers "how much money do I actually have".
//
// Broker credit is deliberately NOT in it: MT5 counts a bonus or credit line
// inside equity, but it is the broker's money and cannot be withdrawn. Using
// raw equity here overstated the total by exactly the credit. See
// lib/trading/capital.ts.
//
// It used to be a 42px figure inside a gradient card with a corner glow, taking
// ~180px of the fold to say one thing. Now it's a band: the total on the left,
// the two components and the split on the right, all on one hairline surface.
export function NetWorthCard({ holdingsValueEur, holdingsLoading }: {
  holdingsValueEur: number
  holdingsLoading: boolean
}) {
  const { snapshot, loading: snapLoading } = useAccountSnapshot()

  const credit     = snapshot?.credit ?? null
  const tradingEur = snapshot
    ? ownCapital(snapshot.equity ?? snapshot.balance ?? 0, credit)
    : 0
  const loading    = snapLoading || holdingsLoading
  const total      = tradingEur + holdingsValueEur

  const tradingPct  = total > 0 ? (tradingEur / total) * 100 : 0
  const holdingsPct = total > 0 ? 100 - tradingPct : 0

  const rows = [
    { label: 'Trading accounts', sub: snapshot ? 'Your MT5 capital, live' : 'Connect MT5 to include', value: tradingEur, pct: tradingPct, ink: 'var(--color-ink-1)' },
    { label: 'Investments',      sub: 'Stocks · ETFs · Metals',      value: holdingsValueEur,   pct: holdingsPct, ink: 'var(--color-ink-3)' },
  ]

  return (
    <div style={{
      background: 'var(--color-surface-1)',
      border: '1px solid var(--color-line-1)',
      borderRadius: 'var(--radius-card)',
      padding: '12px 14px',
    }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: '16px' }}>
        <div style={{ minWidth: 0 }}>
          <Label>Total net worth</Label>
          <div style={{ marginTop: '4px' }}>
            <Num size="3xl" tone="neutral">{loading ? '—' : fmtEur(total)}</Num>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--color-ink-3)', fontSize: 'var(--text-xs)' }}>
            Trading capital plus long-term assets.
          </p>
          {/* The broker's money is named, not silently dropped — otherwise the
              total no longer ties out against the equity shown in MT5. */}
          {!loading && hasCredit(credit) && (
            <p style={{ margin: '2px 0 0', color: 'var(--color-ink-4)', fontSize: 'var(--text-xs)' }}>
              Excludes {fmtEur(Number(credit))} broker credit — lent, not yours.
            </p>
          )}
        </div>

        <div style={{ minWidth: 'min(300px, 100%)' }}>
          {rows.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: r.ink, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: 'var(--color-ink-2)', fontSize: 'var(--text-base)' }}>{r.label}</p>
                  <p style={{ margin: 0, color: 'var(--color-ink-4)', fontSize: 'var(--text-xs)' }}>{r.sub}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <Num size="sm" tone="neutral">{loading ? '—' : fmtEur(r.value)}</Num>
                <Num size="2xs" tone="muted">{loading ? '' : `${r.pct.toFixed(0)}%`}</Num>
              </div>
            </div>
          ))}

          {/* Split bar — the two components at their real proportions */}
          <div style={{ display: 'flex', height: '3px', overflow: 'hidden', marginTop: '5px', background: 'var(--color-surface-2)', gap: '1px' }}>
            {!loading && total > 0 && (
              <>
                <div style={{ width: `${tradingPct}%`, background: 'var(--color-ink-1)', transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
                <div style={{ width: `${holdingsPct}%`, background: 'var(--color-ink-3)', transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
