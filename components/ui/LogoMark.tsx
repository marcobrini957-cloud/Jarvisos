interface LogoMarkProps {
  size?: number
  showBackground?: boolean
}

// VQ monogram — deep black tile, letters in a white → 50% white vertical
// gradient. Pure SVG: crisp at every size, zero image requests.
export function LogoMark({ size = 32, showBackground = true }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="VELQUOR"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id="vq-ink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="vq-sheen" cx="0.3" cy="0.12" r="1.1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.07" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.015" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {showBackground && (
        <>
          <rect x="1" y="1" width="62" height="62" rx="14" fill="#04060A" />
          <rect x="1" y="1" width="62" height="62" rx="14" fill="url(#vq-sheen)" />
          <rect x="1.5" y="1.5" width="61" height="61" rx="13.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.13" />
        </>
      )}

      {/* V — sharp, forward-driving */}
      <path
        d="M 12 19 L 18.6 19 L 26.2 40.5 L 33.8 19 L 40.4 19 L 29.6 46.8 L 22.8 46.8 Z"
        fill="url(#vq-ink)"
      />
      {/* Q — ring set against the V's rhythm */}
      <path
        d="M 44.5 24.5
           a 9.8 9.8 0 1 0 0 19.6
           a 9.8 9.8 0 0 0 0 -19.6 Z
           M 44.5 29
           a 5.3 5.3 0 1 1 0 10.6
           a 5.3 5.3 0 0 1 0 -10.6 Z"
        fill="url(#vq-ink)"
        fillRule="evenodd"
        opacity="0.92"
      />
      {/* Q tail */}
      <path
        d="M 47.5 41.2 L 54.4 48.4 L 50.6 51.2 L 44.4 44.3 Z"
        fill="url(#vq-ink)"
        opacity="0.92"
      />
    </svg>
  )
}
