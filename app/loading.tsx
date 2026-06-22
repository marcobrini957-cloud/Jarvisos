export default function Loading() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0A0A0F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <style>{`
        @keyframes vq-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes vq-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(201,168,76,0.5)); }
          50%       { filter: drop-shadow(0 0 22px rgba(201,168,76,0.9)) drop-shadow(0 0 48px rgba(201,168,76,0.35)); }
        }
        .vq-path {
          fill: none;
          animation: vq-draw 0.5s ease forwards;
          stroke-dashoffset: var(--len);
          stroke-dasharray: var(--len);
        }
        .vq-slash {
          fill: none;
          animation: vq-draw 0.28s cubic-bezier(0.4,0,0.2,1) 1.55s forwards,
                     vq-glow 1.8s ease-in-out 1.85s infinite;
          stroke-dashoffset: 306;
          stroke-dasharray: 306;
        }
      `}</style>

      <svg width="120" height="120" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" rx="72" fill="#0A0A0F"/>

        {/* V — left leg */}
        <path
          className="vq-path"
          style={{ '--len': '201', animationDelay: '0.1s' } as React.CSSProperties}
          d="M 40 110 L 126 292"
          stroke="#FFFFFF" strokeWidth="24" strokeLinecap="round"
        />
        {/* V — right leg */}
        <path
          className="vq-path"
          style={{ '--len': '201', animationDelay: '0.45s' } as React.CSSProperties}
          d="M 126 292 L 212 110"
          stroke="#FFFFFF" strokeWidth="24" strokeLinecap="round"
        />
        {/* Q — 310° arc */}
        <path
          className="vq-path"
          style={{ '--len': '400', animationDelay: '0.75s', animationDuration: '0.8s' } as React.CSSProperties}
          d="M 202.7 192.3 A 74 74 0 1 1 236.8 244.8"
          stroke="#FFFFFF" strokeWidth="24" strokeLinecap="round"
        />
        {/* Gold slash */}
        <path
          className="vq-slash"
          d="M 126 294 L 363 100"
          stroke="#C9A84C" strokeWidth="26" strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
