'use client'

// Signature Trader DNA visual: a radar of the five behavioral dimensions plus
// trait chips and the AI focus callout. Pure presentational — used live in the
// dashboard and with demo data in the landing showcase.

export interface DnaDim { key: string; label: string; score: number; hint?: string }
export interface DnaShape {
  dimensions:        DnaDim[]
  impulsiveness:     string
  recoveryAfterLoss: string
  bestWindow:        string | null
  worstCondition:    string | null
  overall:           number
}

const SIZE = 260
const CENTER = SIZE / 2
const RMAX = SIZE / 2 - 42

function pointsFor(scores: number[], radiusScale = 1): string {
  const n = scores.length
  return scores.map((s, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const r = (Math.max(4, s) / 100) * RMAX * radiusScale
    return `${CENTER + r * Math.cos(ang)},${CENTER + r * Math.sin(ang)}`
  }).join(' ')
}

function axisPoint(i: number, n: number, r: number) {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
  return { x: CENTER + r * Math.cos(ang), y: CENTER + r * Math.sin(ang) }
}

function scoreColor(s: number): string {
  if (s >= 75) return 'var(--gr2, #00FF85)'
  if (s >= 50) return 'var(--am2, #FACC15)'
  return 'var(--re, #F87171)'
}

export function TraderDnaVisual({ dna, focus }: { dna: DnaShape; focus?: string }) {
  const n      = dna.dimensions.length
  const scores = dna.dimensions.map(d => d.score)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center', justifyContent: 'center' }}>
      {/* Radar */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
          <defs>
            <radialGradient id="dnaFill" cx="50%" cy="50%" r="60%">
              <stop offset="0%"  stopColor="rgba(77,143,255,0.55)" />
              <stop offset="100%" stopColor="rgba(77,143,255,0.10)" />
            </radialGradient>
          </defs>
          {/* grid rings */}
          {[0.25, 0.5, 0.75, 1].map((f, ri) => (
            <polygon key={ri}
              points={pointsFor(new Array(n).fill(100), f)}
              fill="none" stroke="var(--bd2, #1E1E30)" strokeWidth="1" opacity={0.7} />
          ))}
          {/* spokes */}
          {dna.dimensions.map((_, i) => {
            const p = axisPoint(i, n, RMAX)
            return <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="var(--bd2, #1E1E30)" strokeWidth="1" opacity={0.6} />
          })}
          {/* the DNA polygon */}
          <polygon points={pointsFor(scores)} fill="url(#dnaFill)" stroke="var(--ac, #4D8FFF)" strokeWidth="2"
            style={{ animation: 'dnaPulse 4s ease-in-out infinite' }} />
          {/* vertices */}
          {dna.dimensions.map((d, i) => {
            const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n
            const r = (Math.max(4, d.score) / 100) * RMAX
            return <circle key={i} cx={CENTER + r * Math.cos(ang)} cy={CENTER + r * Math.sin(ang)} r={3.5} fill={scoreColor(d.score)} />
          })}
          {/* axis labels */}
          {dna.dimensions.map((d, i) => {
            const p = axisPoint(i, n, RMAX + 22)
            return (
              <text key={i} x={p.x} y={p.y} fontSize="8.5" fill="var(--t2, #9090A8)"
                textAnchor="middle" dominantBaseline="middle" style={{ letterSpacing: 0.3 }}>
                {d.label.split(' ')[0]}
              </text>
            )
          })}
        </svg>
        {/* center overall score */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--t1, #fff)', lineHeight: 1 }}>{dna.overall}</div>
          <div style={{ fontSize: 8, letterSpacing: 2, color: 'var(--t3, #48485E)', marginTop: 2 }}>DNA SCORE</div>
        </div>
      </div>

      {/* Right column: dimension bars + traits */}
      <div style={{ flex: '1 1 300px', minWidth: 280, maxWidth: 420 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
          {dna.dimensions.map(d => (
            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--t2, #9090A8)', width: 130, flexShrink: 0 }}>{d.label}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--bd2, #1E1E30)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(3, d.score)}%`, height: '100%', background: scoreColor(d.score), borderRadius: 3, transition: 'width .8s ease' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(d.score), width: 26, textAlign: 'right' }}>{d.score}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Trait label="Impulsiveness" value={dna.impulsiveness} bad={dna.impulsiveness === 'High'} />
          <Trait label="Loss Recovery" value={dna.recoveryAfterLoss} bad={dna.recoveryAfterLoss === 'Poor'} />
          {dna.bestWindow && <Trait label="Best Window" value={dna.bestWindow} good />}
          {dna.worstCondition && <Trait label="Watch Out" value={dna.worstCondition} bad />}
        </div>
      </div>

      {/* AI focus callout — full width under the two columns */}
      {focus && (
        <div style={{
          flexBasis: '100%', marginTop: 4, padding: '16px 18px', borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(77,143,255,0.08), rgba(200,133,26,0.05))',
          border: '1px solid rgba(77,143,255,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--go2, #C8851A)' }} />
            <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--go2, #C8851A)', fontWeight: 700 }}>YOUR BIGGEST OPPORTUNITY</span>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--t1, #fff)', margin: 0 }}>{focus}</p>
        </div>
      )}

      <style>{`@keyframes dnaPulse { 0%,100% { opacity: 0.85 } 50% { opacity: 1 } }`}</style>
    </div>
  )
}

function Trait({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  const color = good ? 'var(--gr2, #00FF85)' : bad ? 'var(--re, #F87171)' : 'var(--t2, #9090A8)'
  return (
    <div style={{ padding: '7px 11px', borderRadius: 9, background: 'var(--s2, #0F0F16)', border: '1px solid var(--bd2, #1E1E30)' }}>
      <div style={{ fontSize: 8.5, letterSpacing: 1, color: 'var(--t3, #48485E)', marginBottom: 3 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}
