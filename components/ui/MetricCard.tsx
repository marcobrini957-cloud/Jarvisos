interface MetricCardProps {
  title: string
  value: string
  change?: string
  changePositive?: boolean | null
  barColor?: string
  subtitle?: string
  className?: string
}

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

  // Colour the value itself if it looks like a P&L (starts with + or -)
  const valueIsProfit = value.startsWith('+')
  const valueIsLoss   = value.startsWith('-')
  const valueColor    = valueIsProfit ? 'var(--gr2)' : valueIsLoss ? 'var(--re)' : 'var(--t1)'

  return (
    <div
      className={`rounded-xl flex flex-col gap-1.5 ${className}`}
      style={{
        background: 'var(--s1)',
        border: '1px solid var(--bd)',
        padding: '18px 20px 16px',
      }}
    >
      <p style={{
        color: 'var(--t3)',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {title}
      </p>

      <p
        className="num"
        style={{
          color:       valueColor,
          fontSize:    '28px',
          fontWeight:  '700',
          lineHeight:  1.1,
          letterSpacing: '-0.03em',
        }}
      >
        {value}
      </p>

      {(change || subtitle) && (
        <p style={{
          fontSize: '12px',
          fontWeight: 400,
          color: isPositive ? 'var(--gr2)' : isNegative ? 'var(--re)' : 'var(--t3)',
        }}>
          {change || subtitle}
        </p>
      )}
    </div>
  )
}
