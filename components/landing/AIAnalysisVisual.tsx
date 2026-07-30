import { LogoMark } from '@/components/ui/LogoMark'

/**
 * The three dimensions the Analyst reads, and what it concludes.
 *
 * Blue / magenta / gold tinted panels with matching diamond glyphs became three
 * hairline rows. The only colour left is the win rate in the conclusion, which
 * is money.
 */
export function AIAnalysisVisual() {
  const dims = [
    { label: 'Behavior', tags: ['Mood: Confident', 'Energy: High', 'Focus: Sharp'] },
    { label: 'Strategy', tags: ['Setup: Order Block', 'Session: London', 'Pair: XAUUSD'] },
    { label: 'Habits',   tags: ['Time: 08:00–11:00', 'Trades/day: 2', 'Risk: 1%'] },
  ]

  return (
    <div style={{
      border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-md)',
      background: 'var(--color-void)', overflow: 'hidden',
    }}>
      {dims.map((d, i) => (
        <div key={d.label} style={{
          padding: '13px 15px',
          borderTop: i === 0 ? undefined : '1px solid var(--color-line-1)',
        }}>
          <p style={{
            margin: '0 0 8px',
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
            letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-ink-3)',
          }}>{d.label}</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {d.tags.map(tag => (
              <span key={tag} style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
                padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface-1)', color: 'var(--color-ink-2)',
                border: '1px solid var(--color-line-1)',
              }}>{tag}</span>
            ))}
          </div>
        </div>
      ))}

      <div style={{
        padding: '14px 15px', borderTop: '1px solid var(--color-line-2)',
        background: 'var(--color-surface-1)',
        display: 'flex', gap: '10px', alignItems: 'flex-start',
      }}>
        <LogoMark size={20} />
        <div>
          <p style={{
            margin: '0 0 6px',
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
            letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-ink-3)',
          }}>Velquor found a pattern</p>
          <p style={{
            margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
            color: 'var(--color-ink-2)', lineHeight: 1.6,
          }}>
            Confident + London + Order Block = <span className="vq-num" style={{ color: 'var(--color-up)' }}>78%</span> win rate,
            avg <span className="vq-num" style={{ color: 'var(--color-up)' }}>+€142</span>/trade. This exact combination drives
            <span className="vq-num" style={{ color: 'var(--color-ink-1)' }}> 64%</span> of your total profit this month.
          </p>
        </div>
      </div>
    </div>
  )
}
