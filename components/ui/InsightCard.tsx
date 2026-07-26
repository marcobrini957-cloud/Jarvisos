import type { VelquorInsight } from '@/lib/intelligence'
import { Label } from './vq'

/** Only a warning gets colour; the rest are lead-ruled in ink. */
const RULE: Record<string, string> = {
  warning:     'var(--color-down)',
  opportunity: 'var(--color-up)',
}

const LABEL: Record<string, string> = {
  warning:     'Warning',
  trading:     'Trading',
  portfolio:   'Portfolio',
  journal:     'Journal',
  habits:      'Habits',
  opportunity: 'Opportunity',
}

interface Props {
  insight:  VelquorInsight
  compact?: boolean
}

export default function InsightCard({ insight, compact }: Props) {
  const rule = RULE[insight.category] ?? 'var(--color-line-3)'
  const priorityColor = insight.priority === 'high'
    ? 'var(--color-down)'
    : 'var(--color-ink-3)'

  return (
    <div style={{
      borderLeft: `2px solid ${rule}`,
      background: 'var(--color-surface-1)',
      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      padding: compact ? '8px 12px' : '10px 14px',
      display: 'flex', flexDirection: 'column', gap: '5px',
    }}>
      <div className="flex items-center justify-between" style={{ gap: '10px' }}>
        <Label>Velquor · {LABEL[insight.category] ?? insight.category}</Label>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
          letterSpacing: '0.1em', textTransform: 'uppercase', color: priorityColor,
        }}>
          {insight.priority}
        </span>
      </div>

      <p style={{
        color: 'var(--color-ink-1)', fontFamily: 'var(--font-display)',
        fontSize: compact ? 'var(--text-base)' : 'var(--text-md)',
        lineHeight: 1.5, margin: 0,
      }}>
        {insight.message}
      </p>

      {insight.action && (
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
          color: 'var(--color-ink-2)', display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          → {insight.action}
        </span>
      )}
    </div>
  )
}
