interface LogoMarkProps {
  size?: number
  showBackground?: boolean
}

export function LogoMark({ size = 32 }: LogoMarkProps) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.18),
      overflow: 'hidden',
      flexShrink: 0,
      display: 'block',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/vq-logo-new.png"
        alt="VELQUOR"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
          transformOrigin: '45% 45%',
          transform: 'scale(1.38)',
        }}
      />
    </div>
  )
}
