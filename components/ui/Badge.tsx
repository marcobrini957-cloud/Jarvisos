import { ReactNode } from 'react'

type BadgeVariant =
  | 'buy' | 'sell'
  | 'london' | 'new_york' | 'asian' | 'overlap'
  | 'win' | 'loss'
  | 'screenshot'
  | 'trading' | 'portfolio' | 'life' | 'general'
  | 'high' | 'medium' | 'low'
  | 'bullish' | 'bearish' | 'neutral'
  | 'open' | 'closed' | 'pending'
  | 'opportunity' | 'risk'
  | string

interface BadgeProps {
  variant:    BadgeVariant
  children:   ReactNode
  className?: string
}

/**
 * Direction and outcome are the only things a badge may colour. Session,
 * category, priority and status are words, and a word does not need a hue —
 * the old set ran eight tints, so a trade row read like a paint chart.
 */
type Kind = 'up' | 'down' | 'plain'

const KIND: Record<string, Kind> = {
  buy: 'up', win: 'up', bullish: 'up', opportunity: 'up',
  sell: 'down', loss: 'down', bearish: 'down', high: 'down', risk: 'down', screenshot: 'down',
}

const STYLES: Record<Kind, { bg: string; color: string }> = {
  up:    { bg: 'var(--color-up-dim)',    color: 'var(--color-up)'    },
  down:  { bg: 'var(--color-down-dim)',  color: 'var(--color-down)'  },
  plain: { bg: 'var(--color-surface-2)', color: 'var(--color-ink-2)' },
}

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  const s = STYLES[KIND[variant] ?? 'plain']
  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{
        background:    s.bg,
        color:         s.color,
        fontFamily:    'var(--font-display)',
        fontSize:      'var(--text-2xs)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding:       '1px 5px',
        borderRadius:  'var(--radius-xs)',
        whiteSpace:    'nowrap',
        lineHeight:    '15px',
      }}
    >
      {children}
    </span>
  )
}
