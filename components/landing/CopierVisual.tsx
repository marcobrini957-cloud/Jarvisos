'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/ui/Icon'

/**
 * The copier, mid-broadcast.
 *
 * Gold borders, gold LEADER labels, glowing green status dots and a lightning
 * emoji for the signal — all replaced with the surfaces the Copy tab actually
 * uses. Dots are ink or ink-4; the one green figure left is the execution
 * confirmation, which is the product doing what it promises with money.
 */
export function CopierVisual() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 2800)
    return () => clearInterval(iv)
  }, [])
  const signalActive = tick % 4 === 1
  const execDone     = tick % 4 === 2

  const label = {
    fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
    letterSpacing: '0.16em', textTransform: 'uppercase' as const,
    color: 'var(--color-ink-3)',
  }

  return (
    <div style={{
      background: 'var(--color-void)', border: '1px solid var(--color-line-1)',
      borderRadius: 'var(--radius-md)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--color-line-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-1)' }}>
          My Copy Group
        </span>
        <span style={label}>Active</span>
      </div>

      <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--color-line-1)' }}>
        <p style={{ ...label, margin: '0 0 7px' }}>Leader</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-ink-1)', display: 'block' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-1)' }}>
              ICM Main Live
            </span>
          </div>
          <span className="vq-num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>#452891</span>
        </div>
      </div>

      {/* The signal in flight. Motion here is state changing, which is the one
          kind the ban list keeps. */}
      <div style={{
        padding: '7px 14px',
        borderBottom: '1px solid var(--color-line-1)',
        background: signalActive || execDone ? 'var(--color-surface-1)' : 'transparent',
        display: 'flex', alignItems: 'center', gap: '8px',
        opacity: signalActive || execDone ? 1 : 0,
        transition: 'opacity 0.3s, background 0.3s',
        minHeight: '30px',
        color: execDone ? 'var(--color-up)' : 'var(--color-ink-3)',
      }}>
        <Icon name={execDone ? 'check' : 'swap'} size={11} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)' }}>
          {signalActive && 'XAUUSD BUY 0.5 lots — broadcasting to followers…'}
          {execDone && 'All followers executed — avg 1.8 seconds'}
        </span>
      </div>

      <div style={{ padding: '11px 14px' }}>
        <p style={{ ...label, margin: '0 0 9px' }}>Follower accounts (3)</p>
        {[
          { name: 'FTMO Demo #781234', status: 'active', execLots: '0.5 lots' },
          { name: 'Hedge Fund #334-B', status: 'active', execLots: '0.25 lots' },
          { name: 'Personal ICM #229', status: 'paused', execLots: null },
        ].map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: i < 2 ? '1px solid var(--color-line-1)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', display: 'block',
                background: s.status === 'active' ? 'var(--color-ink-2)' : 'var(--color-ink-4)',
              }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-2)' }}>
                {s.name}
              </span>
            </div>
            {execDone && s.execLots ? (
              <span className="vq-num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-up)' }}>{s.execLots}</span>
            ) : (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>{s.status}</span>
            )}
          </div>
        ))}
      </div>

      <div style={{
        padding: '9px 14px', borderTop: '1px solid var(--color-line-1)',
        display: 'flex', gap: '20px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>Avg execution</span>
          <span className="vq-num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-1)' }}>1.8s</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>Signals today</span>
          <span className="vq-num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-1)' }}>47</span>
        </div>
      </div>
    </div>
  )
}
