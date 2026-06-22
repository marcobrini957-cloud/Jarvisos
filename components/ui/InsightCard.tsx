import type { VelquorInsight } from '@/lib/intelligence'

const BORDER: Record<string, string> = {
  warning:     'var(--re)',
  trading:     'var(--am2)',
  portfolio:   'var(--gr2)',
  journal:     'var(--ac)',
  habits:      'var(--ac)',
  opportunity: '#a371f7',
}

const BG: Record<string, string> = {
  warning:     'rgba(226,75,74,0.06)',
  trading:     'rgba(186,117,23,0.06)',
  portfolio:   'rgba(99,153,34,0.06)',
  journal:     'rgba(88,166,255,0.06)',
  habits:      'rgba(88,166,255,0.06)',
  opportunity: 'rgba(163,113,247,0.06)',
}

const LABEL: Record<string, string> = {
  warning:     'WARNING',
  trading:     'TRADING',
  portfolio:   'PORTFOLIO',
  journal:     'JOURNAL',
  habits:      'HABITS',
  opportunity: 'OPPORTUNITY',
}

interface Props {
  insight:  VelquorInsight
  compact?: boolean
}

export default function InsightCard({ insight, compact }: Props) {
  const border = BORDER[insight.category] ?? 'var(--bd2)'
  const bg     = BG[insight.category]     ?? 'transparent'

  return (
    <div style={{
      borderLeft:  `3px solid ${border}`,
      background:  bg,
      borderRadius: '0 8px 8px 0',
      padding:     compact ? '10px 14px' : '14px 16px',
      display:     'flex',
      flexDirection: 'column',
      gap:         '6px',
    }}>
      <div className="flex items-center justify-between">
        <span style={{
          fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
          color: border, textTransform: 'uppercase',
        }}>
          VELQUOR · {LABEL[insight.category]}
        </span>
        <span style={{
          fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
          background: insight.priority === 'high' ? 'rgba(226,75,74,0.15)' : insight.priority === 'medium' ? 'rgba(186,117,23,0.15)' : 'rgba(99,153,34,0.12)',
          color:      insight.priority === 'high' ? 'var(--re)'            : insight.priority === 'medium' ? 'var(--am2)'             : 'var(--gr2)',
        }}>
          {insight.priority}
        </span>
      </div>

      <p style={{ color: 'var(--t1)', fontSize: compact ? '12px' : '13px', lineHeight: '1.6', margin: 0 }}>
        {insight.message}
      </p>

      {insight.action && (
        <span style={{
          fontSize: '11px', color: border, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          → {insight.action}
        </span>
      )}
    </div>
  )
}
