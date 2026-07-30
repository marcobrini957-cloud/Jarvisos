
/**
 * The closing wordmark line. Coolvetica Heavy Compressed is the wordmark cut
 * (DESIGN.md §4.0) and this is the one other place it earns its keep — one
 * line, full width, no gradient.
 */
export function FooterTagline() {
  return (
    <div style={{
      background: 'var(--color-void)',
      borderTop: '1px solid var(--color-line-1)',
      padding: 'clamp(34px, 6vw, 64px) clamp(14px, 4vw, 32px)',
      overflow: 'hidden',
    }}>
      <p style={{
        fontFamily: 'var(--font-mark)',
        fontSize: 'clamp(var(--text-d1), 7.4vw, var(--text-d4))',
        letterSpacing: '0.01em',
        lineHeight: 0.94,
        color: 'var(--color-ink-1)',
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}>
        KNOW EVERY TRADE<span style={{ color: 'var(--color-ink-4)' }}> / </span>OWN YOUR EDGE.
      </p>
    </div>
  )
}
