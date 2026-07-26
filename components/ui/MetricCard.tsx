import { Label, Num } from './vq'

interface MetricCardProps {
  title: string
  value: string
  change?: string
  changePositive?: boolean | null
  barColor?: string
  subtitle?: string
  className?: string
}

/** Single figure in a hairline box. Same anatomy as one cell of MetricStrip. */
export default function MetricCard({
  title,
  value,
  change,
  changePositive,
  subtitle,
  className = '',
}: MetricCardProps) {
  const isPositive = changePositive === true
  const isNegative = changePositive === false

  // A value that opens with a sign is a P&L, and takes the P&L colour.
  const tone = value.startsWith('+') ? 'up' : value.startsWith('-') ? 'down' : 'neutral'

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{
        background:   'var(--color-surface-1)',
        border:       '1px solid var(--color-line-1)',
        borderRadius: 'var(--radius-md)',
        padding:      '11px 14px',
        gap:          '5px',
        minWidth:     0,
      }}
    >
      <Label>{title}</Label>

      <Num size="xl" tone={tone}>{value}</Num>

      {(change || subtitle) && (
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize:   'var(--text-xs)',
          color:      isPositive ? 'var(--color-up)' : isNegative ? 'var(--color-down)' : 'var(--color-ink-3)',
        }}>
          {change || subtitle}
        </span>
      )}
    </div>
  )
}
