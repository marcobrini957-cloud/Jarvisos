'use client'

import { useMemo } from 'react'
import type { Trade } from '@/types'
import type { JournalEntry } from '@/types'
import { BE_THRESHOLD } from '@/hooks/useTrades'

interface ConsistencyScoreProps {
  trades:     Trade[]
  entries:    JournalEntry[]
  dailyLoss:  number   // positive EUR amount lost today
  dailyLimit: number   // limit from localStorage
}

function weekdayDatesViennaThisWeek(): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const day = d.getDay()
    if (day >= 1 && day <= 5) {
      dates.push(d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' }))
    }
  }
  return dates
}

export default function ConsistencyScore({ trades, entries, dailyLoss, dailyLimit }: ConsistencyScoreProps) {
  const criteria = useMemo(() => {
    const weekdays = weekdayDatesViennaThisWeek()
    const since7   = new Date()
    since7.setDate(since7.getDate() - 7)
    const weekTrades = trades.filter(t => t.close_time && new Date(t.close_time) >= since7)

    // 1) Journaled every weekday
    const journaledAll = weekdays.length > 0 && weekdays.every(d => entries.some(e => e.entry_date === d))

    // 2) Win rate > 50% this week
    const weekWins     = weekTrades.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
    const weekLosses   = weekTrades.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
    const weekDecisive = weekWins + weekLosses
    const goodWinRate  = weekDecisive > 0 && weekWins / weekDecisive > 0.5

    // 3) No revenge/FOMO tags this week
    const noBadTags = !weekTrades.some(t =>
      t.tags?.some(tag => tag.toLowerCase().includes('revenge') || tag.toLowerCase().includes('fomo'))
    )

    // 4) Followed plan > 70% on annotated trades
    const annotated = weekTrades.filter(t => t.followed_plan !== null && t.followed_plan !== undefined)
    const followedPlan = annotated.length >= 2
      ? annotated.filter(t => t.followed_plan === true).length / annotated.length >= 0.7
      : annotated.length === 0 ? null  // no data, don't count
      : false

    // 5) Within daily limit
    const withinLimit = dailyLimit <= 0 || dailyLoss < dailyLimit

    return [
      { label: 'Journaled every weekday',       earned: journaledAll },
      { label: 'Win rate > 50% this week',       earned: goodWinRate },
      { label: 'No revenge/FOMO trades',         earned: noBadTags },
      { label: 'Followed plan on 70%+ of trades',earned: followedPlan === null ? false : followedPlan },
      { label: 'Within daily loss limit',        earned: withinLimit },
    ]
  }, [trades, entries, dailyLoss, dailyLimit])

  const score = criteria.filter(c => c.earned).length * 20

  const grade = score >= 80 ? 'Elite'
    : score >= 60 ? 'Good'
    : score >= 40 ? 'Developing'
    : 'Needs work'

  const gradeColor = score >= 80 ? 'var(--gr2)'
    : score >= 60 ? 'var(--am2)'
    : score >= 40 ? 'var(--go2)'
    : 'var(--re)'

  // Arc gauge (semicircle)
  const W = 110, H = 66
  const cx = W / 2, cy = H - 4
  const R  = 48
  const pct = score / 100
  const totalSweep = Math.PI   // 180°

  function arcPt(a: number) {
    return { x: cx + R * Math.cos(a), y: cy - R * Math.sin(a) }
  }

  const p0 = arcPt(Math.PI)   // score = 0 (left)
  const p1 = arcPt(0)         // score = 100 (right)
  const pc = arcPt(Math.PI - pct * totalSweep)

  const bgArc   = `M${p0.x.toFixed(1)},${p0.y.toFixed(1)} A${R},${R} 0 0,1 ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`
  const fillArc = pct > 0
    ? `M${p0.x.toFixed(1)},${p0.y.toFixed(1)} A${R},${R} 0 ${pct > 0.5 ? 1 : 0},1 ${pc.x.toFixed(1)},${pc.y.toFixed(1)}`
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
        Consistency Score
      </span>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Arc gauge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <path d={bgArc} fill="none" stroke="var(--s3)" strokeWidth="8" strokeLinecap="round" />
            {fillArc && (
              <path d={fillArc} fill="none" stroke={gradeColor} strokeWidth="8" strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${gradeColor}88)` }} />
            )}
            {pct > 0 && (
              <circle cx={pc.x} cy={pc.y} r="5" fill={gradeColor} stroke="var(--s1)" strokeWidth="2" />
            )}
          </svg>
          <div style={{
            position: 'absolute', bottom: '2px', left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 800, color: gradeColor, lineHeight: 1, letterSpacing: '-0.04em' }}>
              {score}
            </span>
          </div>
        </div>

        {/* Criteria */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '4px' }}>
          <span style={{
            fontSize: '13px', fontWeight: 700, color: gradeColor,
            background: `${gradeColor}15`, padding: '1px 8px', borderRadius: '4px',
            border: `1px solid ${gradeColor}30`, alignSelf: 'flex-start', marginBottom: '4px',
          }}>
            {grade}
          </span>
          {criteria.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 700,
                color: c.earned ? 'var(--gr2)' : 'var(--t3)',
              }}>
                {c.earned ? '✓' : '○'}
              </span>
              <span style={{ fontSize: '11px', color: c.earned ? 'var(--t2)' : 'var(--t3)' }}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
