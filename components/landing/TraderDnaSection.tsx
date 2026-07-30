import { TraderDnaVisual, type DnaShape } from '@/components/TraderDnaVisual'
import { Section, SectionHead } from './Section'

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

/**
 * The DNA profile, shown with the real component the dashboard renders.
 *
 * The blue ambient glow behind it, the blue pill above it, the centred column
 * and the 80px drop shadow under the card are gone; what is left is the visual
 * itself on a hairline surface, which is what a reader came to see.
 */
export function TraderDnaSection() {
  return (
    <Section id="trader-dna">
      <SectionHead
        label="Trader DNA"
        title={<>The market has your number.<br />Now you have theirs.</>}
        lead="Every trade you take feeds a living profile of how you actually trade — your discipline, your patience, your emotional stability, the exact conditions that break you. Not another dashboard of numbers. A mirror."
      />

      <div style={{
        background: 'var(--s1)', border: '1px solid var(--color-line-1)',
        borderRadius: 'var(--radius-md)', padding: 'clamp(16px, 2.4vw, 26px)',
      }}>
        <TraderDnaVisual dna={DEMO} focus={DEMO_FOCUS} />
      </div>

      <p style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
        color: 'var(--color-ink-4)', margin: '14px 0 0',
      }}>
        Your DNA sharpens with every trade. The more you trade, the more precisely it knows you.
      </p>
    </Section>
  )
}
