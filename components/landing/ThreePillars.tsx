import { AutoSyncVisual } from './AutoSyncVisual'
import { AIAnalysisVisual } from './AIAnalysisVisual'
import { CopierVisual } from './CopierVisual'
import { Section } from './Section'

/**
 * The three capabilities, at length.
 *
 * They were three tinted cards — green, blue, gold — each with its own
 * background wash, its own border, a 36px coloured mono numeral and a column of
 * coloured ticks. Three accents that carry no meaning is the rainbow ban, and
 * one of them was P&L green sitting next to the words "any MT5 broker", which
 * in this product reads as a claim about money.
 *
 * Now: three bands on one rule, alternating which side the visual sits on. The
 * numeral is ink, the tag is the label voice, and the supporting points are
 * hairline rows — quoted example outputs keep a left rule, because those are
 * the product talking rather than us.
 */
export function ThreePillars() {
  const pillars = [
    {
      num: '01', tag: 'Auto-sync',
      h3: 'Never type a trade\ninto anything. Ever.',
      sub: 'Connect your MT5 account once. From that moment, every trade you take — entry price, stop loss, take profit, open and close time, P&L — appears in your journal automatically. No spreadsheets. No copying ticket numbers. No CSV files. Nothing.',
      quoted: false,
      points: [
        'Works with any MT5 broker worldwide — IC Markets, Pepperstone, FTMO live accounts, any other',
        'Your last 30 days of trade history imports the moment you connect — you start with data, not a blank slate',
        'Live and demo accounts both supported — track your real results and your practice edge side by side',
        'You only add what MT5 cannot capture: your setup type and how you felt. Ten seconds per trade. That is the entire manual workload.',
      ],
      Visual: AutoSyncVisual,
      visualFirst: false,
    },
    {
      num: '02', tag: 'AI analysis',
      h3: 'Find out why you actually win —\nand exactly why you lose.',
      sub: 'VELQUOR reads every trade across three dimensions at once: your behavior — mood, confidence, energy. Your strategy — setups, sessions, instruments. And your trading habits — when you trade, how often, how you size. Then it correlates all three and shows you what the combinations actually mean for your P&L.',
      quoted: true,
      points: [
        'Your NAS100 win rate is 38% overall — but 71% when you trade London only and feel confident',
        'You overtrade after a winner — your 3rd+ trade of the day loses 68% of the time',
        'Cutting NY open entirely would have added +€680 to your last 90 days',
        'Order Block setups on XAUUSD during London: your strongest edge at 78% win rate, avg +€142',
      ],
      Visual: AIAnalysisVisual,
      visualFirst: true,
    },
    {
      num: '03', tag: 'Trade copier',
      h3: 'One leader account.\nEvery follower. Under 2 seconds.',
      sub: 'Running multiple MT5 accounts — a prop firm, a personal account, a fund? VELQUOR\'s built-in trade copier mirrors every position from your leader to any number of follower accounts automatically. No third-party tools, no plugins, no manual copying. Set it up once and manage it all from your dashboard.',
      quoted: false,
      points: [
        'Signals travel from MT5 to your followers in under 2 seconds via VELQUOR Bridge',
        'Proportional or fixed lot sizing — each follower account can have its own configuration',
        'Pause or remove individual followers at any time without touching the leader',
        'Works across any MT5 broker — leader and followers can be at completely different brokers',
      ],
      Visual: CopierVisual,
      visualFirst: false,
    },
  ]

  return (
    <Section>
      <div style={{ marginBottom: 'clamp(36px, 5vw, 64px)' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(30px, 4.6vw, 60px)', lineHeight: 0.99,
          letterSpacing: '-0.035em', color: 'var(--color-ink-1)', margin: '0 0 16px',
        }}>
          Three tools.<br />One trading edge.
        </h2>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 1.5vw, 17px)',
          lineHeight: 1.6, color: 'var(--color-ink-3)', margin: 0, maxWidth: '52ch',
        }}>
          Most traders are missing all three. VELQUOR gives you all of them — built to work together.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(40px, 6vw, 72px)' }}>
        {pillars.map(p => {
          const { Visual } = p
          const text = (
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '18px' }}>
                <span className="vq-num" style={{ fontSize: 'var(--text-xl)', color: 'var(--color-ink-4)' }}>{p.num}</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                  letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-ink-3)',
                }}>{p.tag}</span>
              </div>

              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(21px, 2.7vw, 32px)', lineHeight: 1.1,
                letterSpacing: '-0.03em', color: 'var(--color-ink-1)',
                margin: '0 0 16px', whiteSpace: 'pre-line',
              }}>
                {p.h3}
              </h3>

              <p style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(13px, 1.3vw, 15px)',
                lineHeight: 1.7, color: 'var(--color-ink-3)', margin: '0 0 22px',
              }}>
                {p.sub}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {p.points.map(pt => (
                  <p key={pt} style={{
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                    lineHeight: 1.6, color: 'var(--color-ink-3)', margin: 0,
                    padding: p.quoted ? '10px 0 10px 14px' : '10px 0',
                    borderTop: '1px solid var(--color-line-1)',
                    borderLeft: p.quoted ? '1px solid var(--color-line-2)' : undefined,
                    fontStyle: p.quoted ? 'italic' : 'normal',
                  }}>
                    {p.quoted ? `“${pt}”` : pt}
                  </p>
                ))}
              </div>
            </div>
          )

          return (
            <div key={p.num} className="grid grid-cols-1 lg:grid-cols-2" style={{
              gap: 'clamp(28px, 4vw, 56px)', alignItems: 'center',
            }}>
              {p.visualFirst ? (
                <>
                  <div className="order-2 lg:order-1" style={{ minWidth: 0 }}><Visual /></div>
                  <div className="order-1 lg:order-2">{text}</div>
                </>
              ) : (
                <>
                  {text}
                  <div style={{ minWidth: 0 }}><Visual /></div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}
