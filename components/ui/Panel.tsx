import { ReactNode } from 'react'

/**
 * Panel is the legacy box that twelve tabs already compose. It now renders the
 * same thing `Surface` does in components/ui/vq — hairline, 6px radius, 9/14
 * title bar, no shadow, no shimmer, no accent glow — so converting a tab is a
 * content job, not a re-boxing job. Kept as a separate component only because
 * of the prop surface (`accent`, `noPadding`, `fill`) callers rely on.
 */
interface PanelProps {
  title?:     ReactNode
  children:   ReactNode
  className?: string
  action?:    ReactNode
  noPadding?: boolean
  /** Left lead rule. Only P&L colours belong here now. */
  accent?:    string
  /** Make the content area flex-fill the panel height (for charts that should
      grow to fill the box). */
  fill?:      boolean
}

export default function Panel({ title, children, className = '', action, noPadding = false, accent, fill = false }: PanelProps) {
  return (
    <div
      className={`flex flex-col ${className}`}
      style={{
        background:   'var(--color-surface-1)',
        border:       '1px solid var(--color-line-1)',
        borderLeft:   accent ? `2px solid ${accent}` : undefined,
        borderRadius: 'var(--radius-md)',
        overflow:     'hidden',
        position:     'relative',
        minWidth:     0,
      }}
    >
      {title && (
        <div className="flex items-center justify-between" style={{
          gap: '10px', padding: '9px 14px',
          borderBottom: '1px solid var(--color-line-1)',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
            color: 'var(--color-ink-1)', letterSpacing: '0.01em',
          }}>
            {title}
          </span>
          {action && <div className="flex items-center" style={{ gap: '8px' }}>{action}</div>}
        </div>
      )}

      <div
        className={fill ? 'flex-1 flex flex-col min-h-0' : ''}
        style={{ padding: noPadding ? undefined : '12px 14px', minWidth: 0 }}
      >
        {children}
      </div>
    </div>
  )
}
