import { AutoSyncVisual } from './AutoSyncVisual'
import { AIAnalysisVisual } from './AIAnalysisVisual'
import { CopierVisual } from './CopierVisual'

export function ThreePillars() {
  const pillars = [
    {
      num: '01', tag: 'AUTO-SYNC', tagColor: '#00FF85', tagRgb: '0,255,133',
      h3: 'Never type a trade\ninto anything. Ever.',
      sub: 'Connect your MT5 account once. From that moment, every trade you take — entry price, stop loss, take profit, open and close time, P&L — appears in your journal automatically. No spreadsheets. No copying ticket numbers. No CSV files. Nothing.',
      points: [
        { icon: '✓', color: '#00FF85', text: 'Works with any MT5 broker worldwide — IC Markets, Pepperstone, FTMO live accounts, any other' },
        { icon: '✓', color: '#00FF85', text: 'Your last 30 days of trade history imports the moment you connect — you start with data, not a blank slate' },
        { icon: '✓', color: '#00FF85', text: 'Live and demo accounts both supported — track your real results and your practice edge side by side' },
        { icon: '✓', color: '#00FF85', text: 'You only add what MT5 cannot capture: your setup type and how you felt. Ten seconds per trade. That is the entire manual workload.' },
      ],
      Visual: AutoSyncVisual,
      visualFirst: false,
      cardBg: 'rgba(0,255,133,0.025)',
      cardBorder: 'rgba(0,255,133,0.09)',
    },
    {
      num: '02', tag: 'AI ANALYSIS', tagColor: '#4B8FFF', tagRgb: '75,143,255',
      h3: 'Find out why you actually win —\nand exactly why you lose.',
      sub: 'VELQUOR reads every trade across three dimensions at once: your behavior — mood, confidence, energy. Your strategy — setups, sessions, instruments. And your trading habits — when you trade, how often, how you size. Then it correlates all three and shows you what the combinations actually mean for your P&L.',
      points: [
        { icon: '→', color: '#4B8FFF', text: '"Your NAS100 win rate is 38% overall — but 71% when you trade London only and feel confident"' },
        { icon: '→', color: '#4B8FFF', text: '"You overtrade after a winner — your 3rd+ trade of the day loses 68% of the time"' },
        { icon: '→', color: '#4B8FFF', text: '"Cutting NY open entirely would have added +€680 to your last 90 days"' },
        { icon: '→', color: '#4B8FFF', text: '"Order Block setups on XAUUSD during London: your strongest edge at 78% win rate, avg +€142"' },
      ],
      Visual: AIAnalysisVisual,
      visualFirst: true,
      cardBg: 'rgba(75,143,255,0.025)',
      cardBorder: 'rgba(75,143,255,0.09)',
    },
    {
      num: '03', tag: 'TRADE COPIER', tagColor: '#FFB830', tagRgb: '255,184,48',
      h3: 'One leader account.\nEvery follower. Under 2 seconds.',
      sub: 'Running multiple MT5 accounts — a prop firm, a personal account, a fund? VELQUOR\'s built-in trade copier mirrors every position from your leader to any number of follower accounts automatically. No third-party tools, no plugins, no manual copying. Set it up once and manage it all from your dashboard.',
      points: [
        { icon: '✓', color: '#FFB830', text: 'Signals travel from MT5 to your followers in under 2 seconds via VELQUOR Bridge' },
        { icon: '✓', color: '#FFB830', text: 'Proportional or fixed lot sizing — each follower account can have its own configuration' },
        { icon: '✓', color: '#FFB830', text: 'Pause or remove individual followers at any time without touching the leader' },
        { icon: '✓', color: '#FFB830', text: 'Works across any MT5 broker — leader and followers can be at completely different brokers' },
      ],
      Visual: CopierVisual,
      visualFirst: false,
      cardBg: 'rgba(255,184,48,0.02)',
      cardBorder: 'rgba(255,184,48,0.09)',
    },
  ]

  return (
    <section style={{
      padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)',
      background: '#000',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ marginBottom: 'clamp(40px, 7vw, 72px)' }}>
          <h2 style={{
            fontSize: 'clamp(36px, 7vw, 68px)', fontWeight: 900,
            letterSpacing: '-0.04em', margin: '0 0 16px', color: '#fff', lineHeight: 0.97,
          }}>
            Three tools.<br />One trading edge.
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.42)', fontSize: 'clamp(15px, 2vw, 17px)',
            maxWidth: '480px', margin: 0, lineHeight: 1.65,
          }}>
            Most traders are missing all three. VELQUOR gives you all of them — built to work together.
          </p>
        </div>

        {/* Pillars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {pillars.map((p) => {
            const { Visual } = p
            const textBlock = (
              <div>
                {/* Number label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
                  <span style={{
                    color: p.tagColor, fontSize: '36px', fontWeight: 900,
                    letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'monospace',
                  }}>{p.num}</span>
                  <div style={{ width: '1px', height: '32px', background: `rgba(${p.tagRgb},0.28)`, flexShrink: 0 }} />
                  <span style={{ color: p.tagColor, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p.tag}</span>
                </div>

                {/* Headline */}
                <h3 style={{
                  fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800,
                  letterSpacing: '-0.03em', color: '#fff',
                  margin: '0 0 18px', lineHeight: 1.15,
                  whiteSpace: 'pre-line',
                }}>
                  {p.h3}
                </h3>

                {/* Subtitle */}
                <p style={{
                  color: 'rgba(255,255,255,0.52)', fontSize: 'clamp(14px, 1.6vw, 16px)',
                  lineHeight: 1.72, margin: '0 0 26px',
                }}>
                  {p.sub}
                </p>

                {/* Points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {p.points.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
                      <span style={{ color: pt.color, fontSize: '13px', flexShrink: 0, marginTop: '2px', fontWeight: 700 }}>{pt.icon}</span>
                      <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: '13px', lineHeight: 1.58, fontStyle: pt.icon === '→' ? 'italic' : 'normal' }}>{pt.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )

            const visualBlock = (
              <div>
                <Visual />
              </div>
            )

            return (
              <div
                key={p.num}
                style={{
                  padding: 'clamp(28px, 4vw, 48px)',
                  borderRadius: '10px',
                  background: p.cardBg,
                  border: `1px solid ${p.cardBorder}`,
                }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(28px, 5vw, 56px)', alignItems: 'center' }}>
                  {p.visualFirst ? (
                    <>
                      <div className="order-2 lg:order-1">{visualBlock}</div>
                      <div className="order-1 lg:order-2">{textBlock}</div>
                    </>
                  ) : (
                    <>
                      <div>{textBlock}</div>
                      <div>{visualBlock}</div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

