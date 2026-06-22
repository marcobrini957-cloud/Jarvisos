interface LogoMarkProps {
  size?: number
  showBackground?: boolean
}

export function LogoMark({ size = 32, showBackground = true }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {showBackground && <rect width="400" height="400" rx="72" fill="#0A0A0F"/>}
      <path
        d="M 40 110 L 126 292 L 212 110"
        fill="none" stroke="#FFFFFF" strokeWidth="24"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M 202.7 192.3 A 74 74 0 1 1 236.8 244.8"
        fill="none" stroke="#FFFFFF" strokeWidth="24"
        strokeLinecap="round"
      />
      <path
        d="M 126 294 L 363 100"
        fill="none" stroke="#C9A84C" strokeWidth="26"
        strokeLinecap="round"
      />
    </svg>
  )
}
