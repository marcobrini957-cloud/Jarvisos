'use client'

import { useState, type ReactNode } from 'react'
import { InfoTip } from './InfoTip'
import { Label, Num, Segmented } from './vq'

export type Period = 'D' | 'W' | 'M' | 'Q' | 'Y'

const PERIOD_LABELS: Record<Period, string> = {
  D: 'Day', W: 'Week', M: 'Month', Q: 'Quarter', Y: 'Year',
}

interface PeriodMetricCardProps {
  title:          string
  /** Deprecated — the 2.0 language has no accent colour. Kept for callers. */
  barColor?:      string
  periods?:       Period[]
  getValue:       (period: Period) => { value: string; change?: string; changePositive?: boolean | null }
  /** Optional graphic (ring, donut, …) rendered to the right of the number. */
  getVisual?:     (period: Period) => ReactNode
  /** Optional plain-English explanation shown via an eye/info popover. */
  info?:          ReactNode
  /** Like `info`, but recomputed per period so the text reflects live data. */
  getInfo?:       (period: Period) => ReactNode
  /** Optional heading for the info popover. */
  infoTitle?:     string
  defaultPeriod?: Period
  className?:     string
}

export default function PeriodMetricCard({
  title,
  periods = ['D', 'W', 'M', 'Q', 'Y'],
  getValue,
  getVisual,
  info,
  getInfo,
  infoTitle,
  defaultPeriod = 'M',
  className = '',
}: PeriodMetricCardProps) {
  const [period, setPeriod] = useState<Period>(defaultPeriod)
  const { value, change, changePositive } = getValue(period)
  const visual   = getVisual?.(period)
  const infoNode = getInfo ? getInfo(period) : info

  const isPositive = changePositive === true
  const isNegative = changePositive === false
  const tone = value.startsWith('+') ? 'up' : value.startsWith('-') ? 'down' : 'neutral'
  const isFigure = /\d/.test(value)

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{
        background:   'var(--color-surface-1)',
        border:       '1px solid var(--color-line-1)',
        borderRadius: 'var(--radius-md)',
        padding:      '10px 14px 12px',
        gap:          '7px',
        position:     'relative',
        minWidth:     0,
      }}
    >
      {/* Info eye — pinned to the top-right corner */}
      {infoNode && (
        <div style={{ position: 'absolute', top: '9px', right: '10px', zIndex: 3 }}>
          <InfoTip title={infoTitle ?? title} text={infoNode} />
        </div>
      )}

      <Label style={{ paddingRight: infoNode ? '20px' : 0 }}>{title}</Label>

      {/* Period selector on its own line, under the title */}
      <div className="self-start">
        <Segmented
          options={periods.map(p => ({ key: p, label: p }))}
          value={period}
          onChange={setPeriod}
          titles={PERIOD_LABELS}
        />
      </div>

      {/* Figure on the left, graphic on the right */}
      <div className="flex items-center justify-between gap-2" style={{ minWidth: 0 }}>
        <div className="flex flex-col" style={{ minWidth: 0, gap: '3px', overflow: 'hidden' }}>
          {/* The figure gives way before the ring does: at 390px a
              "+€1488.70" at 26px used to run under the donut. */}
          {isFigure
            ? <Num size="2xl" tone={tone} style={{ fontSize: 'clamp(15px, 4.1vw, 26px)', whiteSpace: 'nowrap' }}>{value}</Num>
            : <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 4.1vw, 26px)', color: 'var(--color-ink-1)' }}>{value}</span>}

          {change && (
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize:   'var(--text-xs)',
              color:      isPositive ? 'var(--color-up)' : isNegative ? 'var(--color-down)' : 'var(--color-ink-3)',
            }}>
              {change}
            </span>
          )}
        </div>

        {visual && <div style={{ flexShrink: 0 }}>{visual}</div>}
      </div>
    </div>
  )
}
