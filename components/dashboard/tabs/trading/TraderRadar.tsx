'use client'

import type { Trade } from '@/types'
import { useClassifier } from '@/context/UserProfileContext'
import { calcConsistency } from './helpers'

// ── FIFA-style Trader Radar ───────────────────────────────────────────────────
//
// Six skills, each scored 0–100, each carrying its own grading rule in plain
// words directly under the number. The rule used to live in a collapsed "How is
// this graded?" drawer, which is the wrong default: a score nobody can audit is
// a score nobody should trust, and hiding the method behind a click says we'd
// rather not be asked.
//
// The sixth axis is Consistency, not Avg R:R. Graded R:R punishes a style
// rather than a skill — a scalper at 0.8R and 70% wins is not worse than a
// swing trader at 3R — which is the same reason it was pulled from the KPI
// cards in favour of Expectancy. Consistency (share of trading days closed
// green) grades the trader, not the timeframe.

export function TraderRadar({ closed }: { closed: Trade[] }) {
  const { isWin, isLoss } = useClassifier()
  const N  = 6
  // Give the hex generous room so labels never clip
  const W  = 600, H = 520
  const cx = 300, cy = 260, R = 138

  // ── Metric computations ───────────────────────────────────────────────────

  // 1. Win Rate
  const wins   = closed.filter(t => isWin(t)).length
  const losses = closed.filter(t => isLoss(t)).length
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0

  // 2. Profit Factor — the single most important edge metric
  const grossWin  = closed.reduce((s, t) => s + Math.max(0, t.net_profit ?? 0), 0)
  const grossLoss = Math.abs(closed.reduce((s, t) => s + Math.min(0, t.net_profit ?? 0), 0))
  const pf        = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 3 : 1
  // Industry-norm curve: PF 1.0 = breakeven (33), 1.75 = good (67), 2.5+ = elite (100).
  // Linear: score = 33 + (PF − 1) × 44.67, clamped 0–100.
  const pfScore   = Math.min(100, Math.max(0, 33 + (pf - 1) * (67 / 1.5)))

  // 3. Consistency — share of trading days that closed green. The score IS the
  // percentage: 10 green days out of 14 traded is a 71, no curve applied.
  const consistency = calcConsistency(closed)

  // 4. Discipline — plan adherence
  const planTrades = closed.filter(t => t.followed_plan !== null && t.followed_plan !== undefined)
  const discScore  = planTrades.length > 0
    ? (planTrades.filter(t => t.followed_plan).length / planTrades.length) * 100
    : 50

  // 5. Risk Management — % trades with SL defined, penalized for bad risk tags
  const slTrades      = closed.filter(t => (t.stop_loss ?? 0) > 0)
  const badRiskTrades = closed.filter(t => t.tags?.some(tag => ['No SL', 'Oversize', 'No stop'].includes(tag)))
  const slRate        = closed.length > 0 ? slTrades.length / closed.length : 0.5
  const badRiskRate   = closed.length > 0 ? badRiskTrades.length / closed.length : 0
  const riskScore     = Math.min(100, Math.max(0, (slRate * 70 + (1 - badRiskRate) * 30)))

  // 6. Mindset — emotional discipline (no FOMO / revenge / tilt)
  const emotionTrades = closed.filter(t => t.emotion_pre)
  const tiltTrades    = emotionTrades.filter(t => ['fomo', 'anxious', 'tired'].includes(t.emotion_pre!))
  const revengeCount  = closed.filter(t => t.tags?.some(tag => ['Revenge trade', 'FOMO', 'Emotional'].includes(tag))).length
  const tiltRate      = emotionTrades.length > 0 ? tiltTrades.length / emotionTrades.length : 0
  const revengeRate   = closed.length > 0 ? revengeCount / closed.length : 0
  const mindsetScore  = Math.min(100, Math.max(0, 100 - (tiltRate * 60 + revengeRate * 40) * 100))

  // Axes: order = top, TR, BR, bottom, BL, TL (clockwise from 12 o'clock)
  // `has` = this skill has enough logged data to score honestly. Un-logged skills
  // are shown as "—" and EXCLUDED from the OVR (rather than silently counting 50).
  // `how` is the grading rule in the trader's own language, rendered under the
  // number rather than hidden in a drawer. `unlock` says what to log to score an
  // axis that has no data yet — a "—" should always come with its remedy.
  const axes = [
    {
      id: 'wr',
      label: 'WIN RATE',
      value: `${winRate.toFixed(0)}%`,
      sub:   `${wins}W · ${losses}L`,
      score: winRate,
      has:   (wins + losses) > 0,
      how:   'Wins ÷ (wins + losses). Break-even trades count for neither side, so they cannot drag the number down. The score is the percentage itself.',
      unlock: 'Close a few trades to score this.',
    },
    {
      id: 'pf',
      label: 'PROFIT FACTOR',
      value: `${pf.toFixed(2)}×`,
      sub:   pf >= 1.75 ? 'elite edge' : pf >= 1.25 ? 'solid edge' : pf >= 1 ? 'marginal' : 'losing',
      score: pfScore,
      has:   closed.length > 0 && (grossWin > 0 || grossLoss > 0),
      how:   'Gross profit ÷ gross loss, graded against industry norms: 1.00× is break-even and scores 33, 1.75× scores 67, 2.50× and above scores 100.',
      unlock: 'Close a few trades to score this.',
    },
    {
      id: 'cons',
      label: 'CONSISTENCY',
      value: consistency.totalDays > 0 ? `${consistency.pct.toFixed(0)}%` : '—',
      sub:   consistency.totalDays > 0
        ? `${consistency.green}/${consistency.totalDays} days green`
        : 'no trading days yet',
      score: consistency.pct,
      has:   consistency.totalDays > 0,
      how:   'Share of your trading days that closed in profit. Days you did not trade are ignored. Deliberately blind to style — a scalper and a swing trader can both score 100.',
      unlock: 'Trade on a few separate days to score this.',
    },
    {
      id: 'disc',
      label: 'DISCIPLINE',
      value: planTrades.length > 0 ? `${discScore.toFixed(0)}%` : '—',
      sub:   planTrades.length > 0 ? `${planTrades.length} annotated` : 'log plan adherence',
      score: discScore,
      has:   planTrades.length > 0,
      how:   'Share of annotated trades where you marked that you followed your plan. Only trades you have annotated count, so an honest "no" costs you here and nowhere else.',
      unlock: 'Tick “followed plan” when annotating a trade.',
    },
    {
      id: 'risk',
      label: 'RISK MGMT',
      value: `${riskScore.toFixed(0)}%`,
      sub:   `${slTrades.length}/${closed.length} with SL`,
      score: riskScore,
      has:   closed.length > 0,
      how:   'Two parts: how many trades carried a stop-loss (70% of the score) and how few were tagged “No SL”, “No stop” or “Oversize” (the other 30%).',
      unlock: 'Close a few trades to score this.',
    },
    {
      id: 'mind',
      label: 'MINDSET',
      value: emotionTrades.length > 0 ? `${mindsetScore.toFixed(0)}%` : '—',
      sub:   emotionTrades.length > 0
        ? tiltTrades.length === 0 ? 'no tilt detected' : `${tiltTrades.length} tilt sessions`
        : 'log emotions',
      score: mindsetScore,
      has:   emotionTrades.length > 0 || revengeCount > 0,
      how:   'Starts at 100 and comes down for trades entered on FOMO, anxious or tired, and for anything tagged a revenge or emotional trade. Tilt costs more than the tags do.',
      unlock: 'Log how you felt before a trade to score this.',
    },
  ]

  const scored = axes.filter(a => a.has)
  const ovr    = scored.length > 0
    ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length)
    : 0
  // A skill score is not a P&L. Green belongs to money, so strength reads as
  // brightness and only a genuinely weak score keeps the red.
  // The legend below has to keep telling the truth about these. It previously
  // read "green / amber / red" while this function returned white, grey and
  // red — a caption describing a palette that had been replaced underneath it.
  const scoreCol = (s: number) => s >= 70 ? 'var(--color-key)' : s >= 45 ? 'var(--color-ink-2)' : 'var(--color-warn)'
  const ovrColor = scoreCol(ovr)

  // ── SVG geometry ──────────────────────────────────────────────────────────
  const angle   = (i: number) => -Math.PI / 2 + (2 * Math.PI / N) * i
  const pt      = (i: number, v: number) => ({
    x: cx + R * v * Math.cos(angle(i)),
    y: cy + R * v * Math.sin(angle(i)),
  })
  const hexPath = (v: number) => {
    const pts = Array.from({ length: N }, (_, i) => pt(i, v))
    return pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
  }
  const dataPath = () => {
    const pts = axes.map((a, i) => pt(i, a.has ? Math.max(0.04, a.score / 100) : 0.04))
    return pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
  }

  // Per-axis label anchor & origin (tuned per position so nothing clips)
  // DIST 1.43 × R=138 = ~197px from center
  const LDIST = 1.43
  const labelCfg: { lx: number; ly: number; anchor: 'start' | 'middle' | 'end' }[] = axes.map((_, i) => {
    const ang    = angle(i)
    const cosA   = Math.cos(ang)
    const sinA   = Math.sin(ang)
    const lx     = cx + R * LDIST * cosA
    const ly     = cy + R * LDIST * sinA
    const anchor: 'start' | 'middle' | 'end' = cosA > 0.25 ? 'start' : cosA < -0.25 ? 'end' : 'middle'
    // Nudge top/bottom labels slightly along Y so the 3 text lines don't run together
    const lyAdj  = sinA < -0.5 ? ly - 4 : sinA > 0.5 ? ly + 4 : ly
    return { lx, ly: lyAdj, anchor }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible', maxWidth: '600px' }}
      >
        <defs>
          {/* The three gaussian glow filters this chart used to run — polygon,
              vertex dots and the OVR badge — are gone; a radar is a gauge. */}
          {/* Data fill */}
          <linearGradient id="rfill2" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.10" />
          </linearGradient>
        </defs>

        {/* ── Background hex tint ── */}
        <path d={hexPath(1)} fill="rgba(255,255,255,0.016)" />

        {/* ── Grid rings ── */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <path key={v} d={hexPath(v)} fill="none"
            stroke={v === 1.0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.055)'}
            strokeWidth={v === 1.0 ? 1.5 : 1}
            strokeDasharray={v < 1.0 ? '3 4' : undefined}
          />
        ))}

        {/* ── Ring value labels along top spoke ── */}
        {[25, 50, 75].map(v => {
          const p = pt(0, v / 100)
          return (
            <text key={v}
              x={(p.x + 5).toFixed(1)} y={(p.y + 1).toFixed(1)}
              fontSize="10" fill="rgba(255,255,255,0.18)"
              fontFamily="var(--font-mono)" textAnchor="start"
            >{v}</text>
          )
        })}

        {/* ── Spoke cross-ticks ── */}
        {axes.map((_, i) =>
          [0.25, 0.5, 0.75].map(v => {
            const p   = pt(i, v)
            const ang = angle(i)
            const tx  = Math.sin(ang) * 4
            const ty  = -Math.cos(ang) * 4
            return (
              <line key={`${i}-${v}`}
                x1={(p.x - tx).toFixed(1)} y1={(p.y - ty).toFixed(1)}
                x2={(p.x + tx).toFixed(1)} y2={(p.y + ty).toFixed(1)}
                stroke="rgba(255,255,255,0.14)" strokeWidth="1"
              />
            )
          })
        )}

        {/* ── Axis spokes ── */}
        {axes.map((_, i) => {
          const end = pt(i, 1)
          return (
            <line key={i} x1={cx} y1={cy}
              x2={end.x.toFixed(1)} y2={end.y.toFixed(1)}
              stroke="rgba(255,255,255,0.07)" strokeWidth="1"
            />
          )
        })}

        {/* ── Data polygon fill ── */}
        <path d={dataPath()} fill="url(#rfill2)" />

        {/* ── Data polygon outline ── */}
        <path d={dataPath()} fill="none"
          stroke="#FFFFFF" strokeWidth="1.5" opacity="0.9"
        />

        {/* ── Vertex dots ── */}
        {axes.map((a, i) => {
          const p   = pt(i, a.has ? Math.max(0.04, a.score / 100) : 0.04)
          // Un-logged skills render as a faint hollow dot near the centre.
          if (!a.has) {
            return (
              <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                r="4" fill="rgba(0,0,0,0.95)" stroke="rgba(255,255,255,0.22)"
                strokeWidth="1.5" strokeDasharray="2 2" />
            )
          }
          const col = scoreCol(a.score)
          return (
            <g key={i}>
              <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                r="7" fill="rgba(0,0,0,0.95)" stroke={col} strokeWidth="2.5" />
              <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                r="3.5" fill={col} />
            </g>
          )
        })}

        {/* ── Axis labels — 3 lines: name / value / context ── */}
        {axes.map((a, i) => {
          const { lx, ly, anchor } = labelCfg[i]
          const col = a.has ? scoreCol(a.score) : 'rgba(255,255,255,0.38)'
          return (
            <g key={a.id}>
              {/* metric name */}
              <text
                x={lx.toFixed(1)} y={(ly - 12).toFixed(1)}
                textAnchor={anchor} fontSize="10"
                fill="rgba(255,255,255,0.30)"
                fontFamily="var(--font-display)"
                style={{ letterSpacing: '0.12em' }}
              >{a.label}</text>
              {/* main value */}
              <text
                x={lx.toFixed(1)} y={(ly + 6).toFixed(1)}
                textAnchor={anchor} fontSize="17"
                fill={col} fontFamily="var(--font-mono)" fontWeight="700"
              >{a.value}</text>
              {/* context sub-line */}
              <text
                x={lx.toFixed(1)} y={(ly + 20).toFixed(1)}
                textAnchor={anchor} fontSize="10"
                fill="rgba(255,255,255,0.20)"
                fontFamily="var(--font-display)"
              >{a.sub}</text>
            </g>
          )
        })}

        {/* ── Center OVR badge ── */}
        {/* Outer glow ring */}
        {/* Dark bg */}
        <circle cx={cx} cy={cy} r="48" fill="rgba(0,0,0,0.88)" />
        {/* Accent ring */}
        <circle cx={cx} cy={cy} r="48" fill="none" stroke={ovrColor} strokeWidth="1.5" opacity="0.55" />
        <circle cx={cx} cy={cy} r="44" fill="none" stroke={ovrColor} strokeWidth="0.5" opacity="0.18" />
        {/* Label */}
        <text x={cx} y={cy - 13} textAnchor="middle" fontSize="10"
          fill="rgba(255,255,255,0.28)" fontFamily="var(--font-display)"
          style={{ letterSpacing: '0.20em' }}>OVR</text>
        {/* Score */}
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="30"
          fill={ovrColor} fontFamily="var(--font-mono)" fontWeight="600">{ovr}</text>
        {/* How many skills actually counted toward the OVR */}
        {scored.length < N && (
          <text x={cx} y={cy + 64} textAnchor="middle" fontSize="10"
            fill="rgba(255,255,255,0.30)" fontFamily="var(--font-display)"
            style={{ letterSpacing: '0.10em' }}>{scored.length}/{N} SKILLS SCORED</text>
        )}
      </svg>

      {/* ── How the OVR itself is built. Said once, above the axes it governs. ── */}
      <div style={{ width: '100%', maxWidth: '620px', marginTop: '6px' }}>
        <p style={{ color: 'var(--color-ink-3)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
          Your <strong style={{ color: 'var(--color-ink-1)' }}>OVR</strong> is the plain average of the
          six skills below, each scored 0–100. A skill you have not logged data for shows{' '}
          <span style={{ color: 'var(--color-ink-2)' }}>“—”</span> and is left out of the average
          rather than counted as a zero. Scores read{' '}
          <span style={{ color: 'var(--color-key)' }}>blue at 70+</span>,{' '}
          <span style={{ color: 'var(--color-ink-2)' }}>grey from 45–69</span> and{' '}
          <span style={{ color: 'var(--color-warn)' }}>amber below 45</span> — these grade skill, not
          money, so they never borrow green and red.
        </p>
      </div>

      {/* ── The six skills, each with its grading rule underneath ──────────────
          One row per axis: name, score bar, value, then the rule in words. This
          replaced a 6-across pill strip whose grading lived behind a toggle. */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '2px',
        width: '100%', maxWidth: '620px', marginTop: '14px',
      }}>
        {axes.map(a => {
          const col = a.has ? scoreCol(a.score) : 'var(--color-ink-4)'
          return (
            <div key={a.id} style={{
              padding: '12px 0',
              borderTop: '1px solid var(--color-line-1)',
              opacity: a.has ? 1 : 0.72,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
                <span className="vq-label" style={{ whiteSpace: 'nowrap' }}>{a.label}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexShrink: 0 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                    color: 'var(--color-ink-4)',
                  }}>{a.sub}</span>
                  <span className="vq-num" style={{ fontSize: 'var(--text-md)', color: col, minWidth: '56px', textAlign: 'right', display: 'inline-block' }}>
                    {a.value}
                  </span>
                </div>
              </div>

              {/* Score bar — the 0–100 the radar actually plots, made literal. */}
              <div style={{ height: '2px', background: 'var(--color-surface-2)', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: `${a.has ? Math.max(1, Math.min(100, a.score)) : 0}%`,
                  height: '100%', background: col,
                  transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>

              <p style={{
                margin: '8px 0 0', color: 'var(--color-ink-3)',
                fontSize: 'var(--text-sm)', lineHeight: 1.55,
              }}>
                {a.how}{!a.has && ` ${a.unlock}`}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
