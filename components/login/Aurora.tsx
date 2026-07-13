'use client'


// ── Aurora data bars (matches landing page) ───────────────────────────────────
export function Aurora() {
  const bars = Array.from({ length: 40 }, (_, i) => {
    const colors = ['#FF2D9A', '#E040FB', '#7B61FF', '#4BC0FF', '#FF6B9D', '#A78BFA']
    return {
      left: `${(i / 40) * 100}%`,
      height: `${28 + Math.abs(Math.sin(i * 1.71)) * 60}px`,
      width: `${i % 3 === 0 ? 2.5 : i % 3 === 1 ? 1.5 : 1}px`,
      color: colors[i % colors.length],
      delay: `${((i * 0.09) % 2.8).toFixed(2)}s`,
      duration: `${(1.6 + (i * 0.17) % 1.8).toFixed(2)}s`,
      anim: i % 2 === 0 ? 'lp-aurora-a' : 'lp-aurora-b',
    }
  })
  return (
    <>
      <style>{`
        @keyframes lp-aurora-a { 0%,100%{opacity:.7;transform:scaleY(1)} 50%{opacity:.06;transform:scaleY(.4)} }
        @keyframes lp-aurora-b { 0%,100%{opacity:.35;transform:scaleY(.75)} 50%{opacity:.08;transform:scaleY(.35)} }
      `}</style>
      <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '90px', zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
        {bars.map((b, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0,
            left: b.left, width: b.width, height: b.height,
            background: `linear-gradient(180deg,${b.color} 0%,transparent 100%)`,
            animation: `${b.anim} ${b.duration} ease-in-out ${b.delay} infinite`,
            borderRadius: '0 0 2px 2px',
          }} />
        ))}
      </div>
    </>
  )
}

