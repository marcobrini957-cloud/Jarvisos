import Badge from './Badge'

type FeedType = 'trading' | 'portfolio' | 'macro' | 'opportunity' | 'life'

interface FeedCardProps {
  type: FeedType
  title: string
  body: string
  time: string
}

const TYPE_LABEL: Record<FeedType, string> = {
  trading:     'Trading',
  portfolio:   'Portfolio',
  macro:       'News',
  opportunity: 'Opportunity',
  life:        'Life',
}

const TYPE_VARIANT: Record<FeedType, string> = {
  trading:     'trading',
  portfolio:   'portfolio',
  macro:       'low',
  opportunity: 'opportunity',
  life:        'general',
}

export default function FeedCard({ type, title, body, time }: FeedCardProps) {
  return (
    <div
      className="py-3 px-1 rounded-md"
      style={{ borderBottom: '1px solid var(--bd)' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Badge variant={TYPE_VARIANT[type]}>{TYPE_LABEL[type]}</Badge>
        <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{time}</span>
      </div>
      <p style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>
        {title}
      </p>
      <p style={{ color: 'var(--t2)', fontSize: '12px', lineHeight: '1.6' }}>
        {body}
      </p>
    </div>
  )
}
