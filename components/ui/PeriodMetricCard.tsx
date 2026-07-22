'use client'

import { useState, type ReactNode } from 'react'

export type Period = 'D' | 'W' | 'M' | 'Q' | 'Y'

const PERIOD_LABELS: Record<Period, string> = {
  D: 'Day', W: 'Week', M: 'Month', Q: 'Quarter', Y: 'Year',
}

interface PeriodMetricCardProps {
  title:          string
  barColor?:      string
  periods?:       Period[]
  getValue:       (period: Period) => { value: string; change?: string; changePositive?: boolean | null }
  /** Optional graphic (ring, donut, …) rendered to the right of the number. */
  getVisual?:     (period: Period) => ReactNode
  defaultPeriod?: Period
  className?:     string
}

export default function PeriodMetricCard({
  title,
  barColor = 'var(--ac)',
  periods = ['D', 'W', 'M', 'Q', 'Y'],
  getValue,
  getVisual,
  defaultPeriod = 'M',
  className = '',
}: PeriodMetricCardProps) {
  const [period, setPeriod] = useState<Period>(defaultPeriod)
  const { value, change, changePositive } = getValue(period)
  const visual = getVisual?.(period)

  const isPositive    = changePositive === true
  const isNegative    = changePositive === false
  const valueIsProfit = value.startsWith('+')
  const valueIsLoss   = value.startsWith('-')
  const valueColor    = valueIsProfit ? 'var(--gr2)' : valueIsLoss ? 'var(--re)' : 'var(--t1)'

  return (
    <div
      className={`rounded-xl flex flex-col gap-2 ${className}`}
      style={{
        background: 'var(--s1)',
        border:     '1px solid var(--bd2)',
        boxShadow:  'var(--shadow-sm)',
        padding:    '16px 18px 15px',
        position:   'relative',
        overflow:   'hidden',
      }}
    >
      {/* Subtle top glow when positive */}
      {valueIsProfit && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent, rgba(76,217,100,0.4), transparent)`,
        }} />
      )}
      {valueIsLoss && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent, rgba(255,59,48,0.4), transparent)`,
        }} />
      )}

      {/* Title + period selector */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="label-caps">{title}</p>

        <div className="flex items-center" style={{ gap: '1px', background: 'var(--s3)', borderRadius: '6px', padding: '2px' }}>
          {periods.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              title={PERIOD_LABELS[p]}
              style={{
                fontSize:     '10px',
                fontWeight:   period === p ? 600 : 400,
                padding:      '2px 7px',
                borderRadius: '4px',
                border:       'none',
                cursor:       'pointer',
                background:   period === p ? barColor : 'transparent',
                color:        period === p ? 'white'   : 'var(--t3)',
                transition:   'all 0.12s',
                lineHeight:   '16px',
              }}
              onMouseEnter={e => { if (period !== p) e.currentTarget.style.color = 'var(--t2)' }}
              onMouseLeave={e => { if (period !== p) e.currentTarget.style.color = 'var(--t3)' }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Number + change on the left, optional visual (ring/donut) on the right */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2" style={{ minWidth: 0 }}>
          {/* Big number */}
          <p
            className="num"
            style={{
              color:         valueColor,
              fontSize:      '26px',
              fontWeight:    700,
              lineHeight:    1.1,
              letterSpacing: '-0.04em',
            }}
          >
            {value}
          </p>

          {/* Change */}
          {change && (
            <p style={{
              fontSize: '12px',
              color: isPositive ? 'var(--gr2)' : isNegative ? 'var(--re)' : 'var(--t3)',
              marginTop: '-4px',
            }}>
              {change}
            </p>
          )}
        </div>

        {visual && <div style={{ flexShrink: 0 }}>{visual}</div>}
      </div>
    </div>
  )
}
