import { ReactNode } from 'react'

interface PanelProps {
  title?:     ReactNode
  children:   ReactNode
  className?: string
  action?:    ReactNode
  noPadding?: boolean
  accent?:    string
  /** Make the content area flex-fill the panel height (for charts that should
      grow to fill the box). */
  fill?:      boolean
}

export default function Panel({ title, children, className = '', action, noPadding = false, accent, fill = false }: PanelProps) {
  return (
    <div
      className={`rounded-xl flex flex-col ${className}`}
      style={{
        background:  'var(--s1)',
        border:      '1px solid var(--bd2)',
        borderLeft:  accent ? `3px solid ${accent}` : undefined,
        boxShadow:   accent
          ? `0 0 0 1px rgba(255,255,255,0.025), 0 2px 20px rgba(0,0,0,0.55), 0 0 40px ${accent}10`
          : '0 0 0 1px rgba(255,255,255,0.025), 0 2px 16px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top shimmer on accented panels */}
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${accent}55 30%, ${accent}88 50%, ${accent}55 70%, transparent 100%)`,
          pointerEvents: 'none',
        }} />
      )}

      {title && (
        <div className="flex items-center justify-between" style={{
          padding: '13px 18px 12px',
          borderBottom: '1px solid var(--bd)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)',
        }}>
          <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600, letterSpacing: '-0.005em' }}>
            {title}
          </span>
          {action && <div>{action}</div>}
        </div>
      )}

      <div className={`${noPadding ? '' : 'p-4'} ${fill ? 'flex-1 flex flex-col min-h-0' : ''}`}>
        {children}
      </div>
    </div>
  )
}
