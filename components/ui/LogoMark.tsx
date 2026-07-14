interface LogoMarkProps {
  size?: number
  showBackground?: boolean
}

// The VELQUOR mark — a calligraphic V cut with Renaissance stroke contrast
// (broad down-stroke, hairline up-stroke) and the Q reduced to a small
// orbital ring with a tail at the V's shoulder, like a notation mark on a
// draftsman's sheet. A construction circle sits behind at 5% — the kind of
// guide line Leonardo never erased. Letters carry a white → 50% white fade.
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
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.012" />
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

      {/* construction circle — the guide line left in, 5% */}
      <circle cx="31" cy="34" r="23" fill="none" stroke="#FFFFFF" strokeOpacity="0.05" strokeWidth="1" />

      {/* V — broad down-stroke, hairline up-stroke */}
      <path
        d="M 12 18 L 21 18 L 31.6 42.8 L 43 18 L 46.5 18 L 33.2 48 L 28.2 48 Z"
        fill="url(#vq-ink)"
      />

      {/* Q — small orbital ring at the V's shoulder */}
      <circle cx="51" cy="14.5" r="4.6" fill="none" stroke="url(#vq-ink)" strokeWidth="2.1" />
      <line x1="52.4" y1="15.9" x2="56.4" y2="20.1" stroke="url(#vq-ink)" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  )
}
