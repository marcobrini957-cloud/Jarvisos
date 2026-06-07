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

const VARIANT_STYLES: Record<string, { bg: string; color: string; border?: string }> = {
  buy:         { bg: 'rgba(52,199,89,0.1)',   color: 'var(--gr2)', border: 'rgba(52,199,89,0.2)'   },
  sell:        { bg: 'rgba(255,59,48,0.1)',   color: 'var(--re)',  border: 'rgba(255,59,48,0.2)'   },
  win:         { bg: 'rgba(52,199,89,0.1)',   color: 'var(--gr2)', border: 'rgba(52,199,89,0.2)'   },
  loss:        { bg: 'rgba(255,59,48,0.1)',   color: 'var(--re)',  border: 'rgba(255,59,48,0.2)'   },
  bullish:     { bg: 'rgba(52,199,89,0.1)',   color: 'var(--gr2)', border: 'rgba(52,199,89,0.2)'   },
  bearish:     { bg: 'rgba(255,59,48,0.1)',   color: 'var(--re)',  border: 'rgba(255,59,48,0.2)'   },
  high:        { bg: 'rgba(255,59,48,0.1)',   color: 'var(--re)',  border: 'rgba(255,59,48,0.2)'   },
  screenshot:  { bg: 'rgba(255,59,48,0.08)',  color: 'var(--re)',  border: 'rgba(255,59,48,0.18)'  },
  london:      { bg: 'rgba(79,142,247,0.1)',  color: 'var(--ac)',  border: 'rgba(79,142,247,0.2)'  },
  new_york:    { bg: 'rgba(224,152,64,0.1)',  color: 'var(--am2)', border: 'rgba(224,152,64,0.2)'  },
  asian:       { bg: 'rgba(155,114,240,0.1)', color: 'var(--pu)',  border: 'rgba(155,114,240,0.2)' },
  overlap:     { bg: 'rgba(212,160,52,0.1)',  color: 'var(--go2)', border: 'rgba(212,160,52,0.2)'  },
  trading:     { bg: 'rgba(136,146,160,0.08)', color: 'var(--t2)', border: 'rgba(136,146,160,0.14)' },
  portfolio:   { bg: 'rgba(136,146,160,0.08)', color: 'var(--t2)', border: 'rgba(136,146,160,0.14)' },
  life:        { bg: 'rgba(136,146,160,0.08)', color: 'var(--t2)', border: 'rgba(136,146,160,0.14)' },
  general:     { bg: 'rgba(136,146,160,0.08)', color: 'var(--t2)', border: 'rgba(136,146,160,0.14)' },
  medium:      { bg: 'rgba(224,152,64,0.08)',  color: 'var(--am2)', border: 'rgba(224,152,64,0.16)' },
  low:         { bg: 'rgba(136,146,160,0.08)', color: 'var(--t3)', border: 'rgba(136,146,160,0.12)' },
  neutral:     { bg: 'rgba(136,146,160,0.08)', color: 'var(--t3)', border: 'rgba(136,146,160,0.12)' },
  open:        { bg: 'rgba(79,142,247,0.1)',   color: 'var(--ac)',  border: 'rgba(79,142,247,0.2)'  },
  closed:      { bg: 'rgba(136,146,160,0.08)', color: 'var(--t3)', border: 'rgba(136,146,160,0.12)' },
  pending:     { bg: 'rgba(224,152,64,0.08)',  color: 'var(--am2)', border: 'rgba(224,152,64,0.16)' },
  opportunity: { bg: 'rgba(52,199,89,0.08)',   color: 'var(--gr2)', border: 'rgba(52,199,89,0.18)'  },
  risk:        { bg: 'rgba(255,59,48,0.1)',    color: 'var(--re)',  border: 'rgba(255,59,48,0.2)'   },
}

const DEFAULT_STYLE = { bg: 'rgba(136,146,160,0.08)', color: 'var(--t2)', border: 'rgba(136,146,160,0.14)' }

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  const s = VARIANT_STYLES[variant] ?? DEFAULT_STYLE
  return (
    <span
      className={`inline-flex items-center font-medium ${className}`}
      style={{
        background:    s.bg,
        color:         s.color,
        border:        `1px solid ${s.border ?? 'transparent'}`,
        fontSize:      '10px',
        padding:       '1px 6px',
        borderRadius:  '5px',
        letterSpacing: '0.02em',
        whiteSpace:    'nowrap',
        lineHeight:    '16px',
      }}
    >
      {children}
    </span>
  )
}
