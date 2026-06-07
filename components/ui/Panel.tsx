import { ReactNode } from 'react'

interface PanelProps {
  title?:     string
  children:   ReactNode
  className?: string
  action?:    ReactNode
  noPadding?: boolean
  accent?:    string   // optional left-border accent color
}

export default function Panel({ title, children, className = '', action, noPadding = false, accent }: PanelProps) {
  return (
    <div
      className={`rounded-xl flex flex-col ${className}`}
      style={{
        background:  'var(--s1)',
        border:      '1px solid var(--bd2)',
        boxShadow:   'var(--shadow-sm)',
        borderLeft:  accent ? `3px solid ${accent}` : undefined,
        overflow:    'hidden',
      }}
    >
      {title && (
        <div
          className="flex items-center justify-between"
          style={{
            padding:      '13px 16px 11px',
            borderBottom: '1px solid var(--bd)',
            background:   'linear-gradient(180deg, var(--s2) 0%, transparent 100%)',
          }}
        >
          <span style={{
            color:         'var(--t1)',
            fontSize:      '12px',
            fontWeight:    600,
            letterSpacing: '0.005em',
          }}>
            {title}
          </span>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  )
}
