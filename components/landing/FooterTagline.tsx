
export function FooterTagline() {
  return (
    <div style={{
      background: '#000',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: 'clamp(40px, 7vw, 72px) clamp(16px, 4vw, 40px)',
      overflow: 'hidden',
    }}>
      <p style={{
        fontSize: 'clamp(36px, 7.5vw, 96px)',
        fontWeight: 900,
        letterSpacing: '-0.04em',
        lineHeight: 0.92,
        color: '#fff',
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'clip',
      }}>
        KNOW EVERY TRADE<span style={{ color: 'rgba(255,255,255,0.25)' }}> /</span> OWN YOUR EDGE.
      </p>
    </div>
  )
}

