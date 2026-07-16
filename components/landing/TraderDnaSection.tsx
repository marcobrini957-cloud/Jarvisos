import { TraderDnaVisual, type DnaShape } from '@/components/TraderDnaVisual'

// Representative Trader DNA for the landing showcase. Real profiles are computed
// from each user's own trade history.
const DEMO: DnaShape = {
  overall: 75,
  dimensions: [
    { key: 'decision',   label: 'Decision Quality',    score: 89 },
    { key: 'discipline', label: 'Discipline',          score: 71 },
    { key: 'emotional',  label: 'Emotional Stability',  score: 64 },
    { key: 'risk',       label: 'Risk Consistency',     score: 92 },
    { key: 'patience',   label: 'Patience',             score: 58 },
  ],
  impulsiveness:     'High',
  recoveryAfterLoss: 'Poor',
  bestWindow:        '08:00–11:00',
  worstCondition:    'After two consecutive losses',
}

const DEMO_FOCUS =
  'Your biggest opportunity isn’t finding a new strategy — your decision quality (89) and risk consistency (92) are already elite. It’s the impulsive trades after losses. Across your last 500 trades, that single behavior accounts for the largest share of your drawdown. Fix the two-loss spiral and everything else compounds.'

export function TraderDnaSection() {
  return (
    <section id="trader-dna" style={{ padding: '96px 24px', position: 'relative', overflow: 'hidden' }}>
      {/* ambient glow */}
      <div aria-hidden style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(77,143,255,0.10), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 1040, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999,
            background: 'rgba(77,143,255,0.08)', border: '1px solid rgba(77,143,255,0.18)', marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ac, #4D8FFF)' }} />
            <span style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--ac, #4D8FFF)', fontWeight: 700 }}>TRADER DNA</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--t1, #fff)', margin: 0, textWrap: 'balance' }}>
            The market has your number.<br />Now you have theirs.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--t2, #9090A8)', maxWidth: 560, margin: '18px auto 0', textWrap: 'balance' }}>
            Every trade you take feeds a living profile of how you actually trade — your discipline, your patience,
            your emotional stability, the exact conditions that break you. Not another dashboard of numbers.
            A mirror.
          </p>
        </div>

        <div style={{
          padding: '28px 24px', borderRadius: 20, background: 'var(--s1, #12121A)',
          border: '1px solid var(--bd2, #1E1E30)', boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
        }}>
          <TraderDnaVisual dna={DEMO} focus={DEMO_FOCUS} />
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--t3, #48485E)', marginTop: 20 }}>
          Your DNA sharpens with every trade. The more you trade, the more precisely it knows you.
        </p>
      </div>
    </section>
  )
}
