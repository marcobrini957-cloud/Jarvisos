'use client'

import { useState } from 'react'
import { BE_THRESHOLD } from '@/hooks/useTrades'
import type { Trade } from '@/types'

// ── FIFA-style Trader Radar ───────────────────────────────────────────────────

export function TraderRadar({ closed }: { closed: Trade[] }) {
  const [showLegend, setShowLegend] = useState(false)
  const N  = 6
  // Give the hex generous room so labels never clip
  const W  = 600, H = 520
  const cx = 300, cy = 260, R = 138

  // ── Metric computations ───────────────────────────────────────────────────

  // 1. Win Rate
  const wins   = closed.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
  const losses = closed.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0

  // 2. Profit Factor — the single most important edge metric
  const grossWin  = closed.reduce((s, t) => s + Math.max(0, t.net_profit ?? 0), 0)
  const grossLoss = Math.abs(closed.reduce((s, t) => s + Math.min(0, t.net_profit ?? 0), 0))
  const pf        = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 3 : 1
  // Industry-norm curve: PF 1.0 = breakeven (33), 1.75 = good (67), 2.5+ = elite (100).
  // Linear: score = 33 + (PF − 1) × 44.67, clamped 0–100.
  const pfScore   = Math.min(100, Math.max(0, 33 + (pf - 1) * (67 / 1.5)))

  // 3. Avg realized R:R — quality of entry & exit
  const rrTrades = closed.filter(t => t.stop_loss && t.open_price && t.close_price && t.trade_type)
  const avgRR    = rrTrades.length > 0
    ? rrTrades.reduce((s, t) => {
        const dir      = t.trade_type === 'buy' ? 1 : -1
        const realized = dir * ((t.close_price ?? 0) - (t.open_price ?? 0))
        const risk     = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
        return s + (risk > 0 ? realized / risk : 0)
      }, 0) / rrTrades.length
    : null
  // -1R = 0, 0R = 33, +2R = 100
  const rrScore = avgRR !== null ? Math.min(100, Math.max(0, (avgRR + 1) / 3 * 100)) : 50

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
  const axes = [
    {
      id: 'wr',
      label: 'WIN RATE',
      value: `${winRate.toFixed(0)}%`,
      sub:   `${wins}W · ${losses}L`,
      score: winRate,
      has:   (wins + losses) > 0,
    },
    {
      id: 'pf',
      label: 'PROFIT FACTOR',
      value: `${pf.toFixed(2)}×`,
      sub:   pf >= 1.75 ? 'elite edge' : pf >= 1.25 ? 'solid edge' : pf >= 1 ? 'marginal' : 'losing',
      score: pfScore,
      has:   closed.length > 0 && (grossWin > 0 || grossLoss > 0),
    },
    {
      id: 'rr',
      label: 'AVG R:R',
      value: avgRR !== null ? `${avgRR >= 0 ? '+' : ''}${avgRR.toFixed(2)}R` : '—',
      sub:   rrTrades.length > 0 ? `${rrTrades.length} trades w/ SL` : 'add SL to trades',
      score: rrScore,
      has:   rrTrades.length > 0,
    },
    {
      id: 'disc',
      label: 'DISCIPLINE',
      value: planTrades.length > 0 ? `${discScore.toFixed(0)}%` : '—',
      sub:   planTrades.length > 0 ? `${planTrades.length} annotated` : 'log plan adherence',
      score: discScore,
      has:   planTrades.length > 0,
    },
    {
      id: 'risk',
      label: 'RISK MGMT',
      value: `${riskScore.toFixed(0)}%`,
      sub:   `${slTrades.length}/${closed.length} with SL`,
      score: riskScore,
      has:   closed.length > 0,
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
    },
  ]

  const scored = axes.filter(a => a.has)
  const ovr    = scored.length > 0
    ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length)
    : 0
  const scoreCol = (s: number) => s >= 70 ? '#4ade80' : s >= 45 ? '#facc15' : '#f87171'
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
          {/* Polygon glow */}
          <filter id="rglow2" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Dot glow */}
          <filter id="dglow2" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* OVR badge inner glow */}
          <filter id="oglow2" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Data fill gradient — blue → purple */}
          <linearGradient id="rfill2" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.10" />
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
              fontSize="8" fill="rgba(255,255,255,0.18)"
              fontFamily="monospace" textAnchor="start"
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

        {/* ── Data polygon outline — glow pass ── */}
        <path d={dataPath()} fill="none"
          stroke="#3b82f6" strokeWidth="4"
          filter="url(#rglow2)" opacity="0.40"
        />
        {/* ── Data polygon outline — crisp pass ── */}
        <path d={dataPath()} fill="none"
          stroke="#93c5fd" strokeWidth="1.8" opacity="0.90"
        />

        {/* ── Vertex dots ── */}
        {axes.map((a, i) => {
          const p   = pt(i, a.has ? Math.max(0.04, a.score / 100) : 0.04)
          // Un-logged skills render as a faint hollow dot near the centre.
          if (!a.has) {
            return (
              <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                r="4" fill="rgba(2,6,23,0.95)" stroke="rgba(255,255,255,0.22)"
                strokeWidth="1.5" strokeDasharray="2 2" />
            )
          }
          const col = scoreCol(a.score)
          return (
            <g key={i} filter="url(#dglow2)">
              <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)}
                r="7" fill="rgba(2,6,23,0.95)" stroke={col} strokeWidth="2.5" />
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
                textAnchor={anchor} fontSize="8.5"
                fill="rgba(255,255,255,0.30)"
                fontFamily="system-ui, sans-serif"
                style={{ letterSpacing: '0.12em' }}
              >{a.label}</text>
              {/* main value */}
              <text
                x={lx.toFixed(1)} y={(ly + 6).toFixed(1)}
                textAnchor={anchor} fontSize="16"
                fill={col} fontFamily="monospace" fontWeight="800"
              >{a.value}</text>
              {/* context sub-line */}
              <text
                x={lx.toFixed(1)} y={(ly + 20).toFixed(1)}
                textAnchor={anchor} fontSize="8"
                fill="rgba(255,255,255,0.20)"
                fontFamily="system-ui"
              >{a.sub}</text>
            </g>
          )
        })}

        {/* ── Center OVR badge ── */}
        {/* Outer glow ring */}
        <circle cx={cx} cy={cy} r="50" fill={ovrColor} opacity="0.06" filter="url(#oglow2)" />
        {/* Dark bg */}
        <circle cx={cx} cy={cy} r="48" fill="rgba(2,6,23,0.88)" />
        {/* Accent ring */}
        <circle cx={cx} cy={cy} r="48" fill="none" stroke={ovrColor} strokeWidth="1.5" opacity="0.55" />
        <circle cx={cx} cy={cy} r="44" fill="none" stroke={ovrColor} strokeWidth="0.5" opacity="0.18" />
        {/* Label */}
        <text x={cx} y={cy - 13} textAnchor="middle" fontSize="9"
          fill="rgba(255,255,255,0.28)" fontFamily="system-ui"
          style={{ letterSpacing: '0.20em' }}>OVR</text>
        {/* Score */}
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="40"
          fill={ovrColor} fontFamily="monospace" fontWeight="900">{ovr}</text>
        {/* How many skills actually counted toward the OVR */}
        {scored.length < N && (
          <text x={cx} y={cy + 64} textAnchor="middle" fontSize="9"
            fill="rgba(255,255,255,0.30)" fontFamily="system-ui"
            style={{ letterSpacing: '0.10em' }}>{scored.length}/{N} SKILLS SCORED</text>
        )}
      </svg>

      {/* ── Score breakdown pills — flex-wrap so 6-col on desktop, 3-col on mobile ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        gap: '6px', width: '100%', maxWidth: '560px', marginTop: '8px',
      }}>
        {axes.map(a => {
          const col = a.has ? scoreCol(a.score) : 'rgba(255,255,255,0.38)'
          const bg  = !a.has
            ? 'rgba(255,255,255,0.02)' : a.score >= 70
            ? 'rgba(74,222,128,0.08)' : a.score >= 45
            ? 'rgba(77,143,255,0.08)' : 'rgba(248,113,113,0.08)'
          return (
            <div key={a.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              padding: '8px 12px', borderRadius: '8px',
              background: bg, border: `1px solid ${col}25`,
              minWidth: '80px', flex: '1 1 80px', opacity: a.has ? 1 : 0.7,
            }}>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {a.label}
              </span>
              <span style={{ fontSize: '14px', color: col, fontFamily: 'monospace', fontWeight: 800 }}>
                {a.value}
              </span>
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.18)', textAlign: 'center' }}>
                {a.sub}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── "How it's graded" legend — client-ready explainer ── */}
      <div style={{ width: '100%', maxWidth: '560px', marginTop: '14px' }}>
        <button
          onClick={() => setShowLegend(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            width: '100%', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
            background: 'var(--s2)', border: '1px solid var(--bd2)',
            color: 'var(--t2)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
          }}
        >
          <span>{showLegend ? 'Hide' : 'How is this graded?'}</span>
          <span style={{ fontSize: '9px', color: 'var(--t3)', transform: showLegend ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
        </button>

        {showLegend && (
          <div style={{ marginTop: '10px', padding: '14px 16px', borderRadius: '10px', background: 'var(--s2)', border: '1px solid var(--bd2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: 1.6 }}>
              Your <strong style={{ color: 'var(--t1)' }}>OVR</strong> is the average of the skills below, each scored 0–100.
              Skills you haven&apos;t logged data for show <span style={{ color: 'var(--t2)' }}>“—”</span> and are left out of the average — they don&apos;t drag your score down.
              Colours: <span style={{ color: '#4ade80' }}>green ≥ 70</span> · <span style={{ color: '#facc15' }}>amber 45–69</span> · <span style={{ color: '#f87171' }}>red &lt; 45</span>.
            </p>

            {[
              { label: 'Win Rate',      how: 'Your win % directly. Wins ÷ (wins + losses); breakeven trades excluded.' },
              { label: 'Profit Factor', how: 'Gross profit ÷ gross loss. PF 1.0 = breakeven (33), 1.75 = strong (67), 2.5+ = elite (100).' },
              { label: 'Avg R:R',       how: 'Average realised reward-to-risk per trade. −1R = 0, break-even = 33, +2R = 100. Needs a stop-loss on trades.' },
              { label: 'Discipline',    how: 'Share of trades where you followed your plan. Log “followed plan” when annotating a trade.' },
              { label: 'Risk Mgmt',     how: '% of trades with a stop-loss (70% weight) plus absence of “No SL / Oversize” tags (30% weight).' },
              { label: 'Mindset',       how: 'Starts at 100, penalised for FOMO / anxious / tired emotions and revenge-trade tags. Log emotions to activate.' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>{item.label}</span>
                <span style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: 1.5 }}>{item.how}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
