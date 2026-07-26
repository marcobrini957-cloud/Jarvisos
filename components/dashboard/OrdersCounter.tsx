'use client'

import { useEffect, useRef, useState } from 'react'
import type { PlatformStats } from '@/app/api/stats/platform/route'
import { Label, Num } from '@/components/ui/vq'

// ── Platform odometer ─────────────────────────────────────────────────────────
//
// This used to read "412,000,000 real-money orders executed", counting up at 11
// per second from a hardcoded base. It was a time-derived animation — a made-up
// trust signal on a page whose links pay commission. The database says 396.
//
// So the wheels now show a real count from /api/stats/platform and only move
// when it actually moves. The market context underneath is a published figure
// with its source named, because the honest way to put a big number on this page
// is to cite someone who measured it.

// Global FX turnover, BIS Triennial Central Bank Survey, April 2025 (published
// 30 September 2025): "trading in FX markets reached $9.6 trillion per day".
// https://www.bis.org/press/p250930.htm
const BIS = {
  figure: '$9.6T',
  label:  'Global FX turnover per day',
  source: 'BIS Triennial Survey, April 2025',
}

const CELL_H = 46
const CELL_W = 33

function digitsOf(n: number): string[] {
  // At least 4 wheels so the row keeps its shape while the count is small.
  return String(Math.max(0, Math.floor(n))).padStart(4, '0').split('')
}

export default function OrdersCounter() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const stripRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let alive = true
    const load = () => fetch('/api/stats/platform')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive && d) setStats(d) })
      .catch(() => {})
    load()
    const iv = setInterval(load, 60_000)   // the bridge writes constantly
    return () => { alive = false; clearInterval(iv) }
  }, [])

  const digits = digitsOf(stats?.orders ?? 0)

  // Roll each wheel to its digit. Transitions animate the change, so a wheel
  // only turns when the underlying count does.
  useEffect(() => {
    digits.forEach((d, i) => {
      const strip = stripRefs.current[i]
      if (strip) strip.style.transform = `translateY(${-Number(d) * CELL_H}px)`
    })
  }, [digits])

  const leading = digits.findIndex(d => d !== '0')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '4px' }} aria-hidden>
        {digits.map((_, i) => (
          <div
            key={i}
            style={{
              width: `${CELL_W}px`, height: `${CELL_H}px`, overflow: 'hidden',
              borderRadius: 'var(--radius-xs)', background: 'var(--color-surface-2)',
              position: 'relative',
              // Leading zeros stay in place but recede, so the row never jumps
              // width as the count crosses a decade.
              opacity: leading === -1 ? 1 : i < leading ? 0.12 : 1,
              transition: 'opacity 0.4s',
            }}
          >
            <div
              ref={el => { stripRefs.current[i] = el }}
              className="vq-num"
              style={{
                display: 'flex', flexDirection: 'column', willChange: 'transform',
                transition: 'transform 0.7s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {[...Array(10).keys()].map(d => (
                <div
                  key={d}
                  style={{
                    height: `${CELL_H}px`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: `${Math.round(CELL_H * 0.55)}px`,
                    color: 'var(--color-ink-1)',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Label>Orders synced through Velquor</Label>

      {/* Market context — someone else's measurement, credited */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap',
        justifyContent: 'center', marginTop: '2px',
      }}>
        <Num size="sm" tone="neutral">{BIS.figure}</Num>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)' }}>
          {BIS.label}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>
          · {BIS.source}
        </span>
      </div>

      {stats && (stats.mirrored > 0 || stats.accounts > 0) && (
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px' }}>
            <Num size="xs" tone="neutral">{stats.mirrored.toLocaleString('en')}</Num>
            <Label>mirrored by the copy engine</Label>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px' }}>
            <Num size="xs" tone="neutral">{stats.accounts.toLocaleString('en')}</Num>
            <Label>MT5 account{stats.accounts === 1 ? '' : 's'} connected</Label>
          </span>
        </div>
      )}
    </div>
  )
}
