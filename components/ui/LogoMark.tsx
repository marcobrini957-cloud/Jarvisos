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
          width: '135%',
          height: '135%',
          marginLeft: '-17.5%',
          marginTop: '-17.5%',
          display: 'block',
          objectFit: 'cover',
        }}
      />
    </div>
  )
}
