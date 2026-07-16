// Shared premium section eyebrow — the accent-dot pill used in the hero and
// Trader DNA. Standardizing every section on this ties the whole page together.

export function SectionEyebrow({
  children,
  color = '#4B8FFF',
  rgb = '77,143,255',
  align = 'left',
}: {
  children: React.ReactNode
  color?: string
  rgb?: string
  align?: 'left' | 'center'
}) {
  return (
    <div style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : 'flex-start', marginBottom: 16 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '5px 12px', borderRadius: 999,
        background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.2)`,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: color, boxShadow: `0 0 8px ${color}` }} />
        <span style={{ fontSize: 11, letterSpacing: 1.4, color, fontWeight: 700, textTransform: 'uppercase' }}>{children}</span>
      </div>
    </div>
  )
}
