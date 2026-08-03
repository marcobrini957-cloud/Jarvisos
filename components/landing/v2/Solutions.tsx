'use client'

import { Reveal } from './Reveal'
import { Eyebrow, H2, Body, Shell } from './ui'

/**
 * The "Solutions" boxes — the pattern Marco pointed at on the reference.
 *
 * Shape of each one there: a large glass card, big heading top-left, an
 * abstract wireframe UI floating inside it, body copy at the foot, and the
 * whole column pinned so each card slides up and settles over the previous.
 * The illustration is deliberately NOT a screenshot — it reads as product
 * rather than documentation, and it survives a redesign of the real UI.
 *
 * Ours carries VELQUOR's three audiences instead of theirs (banking,
 * investment firms, consulting), and the wireframes show what this product
 * actually does: a rules panel, a leader/follower fan-out, a journal filling
 * itself in.
 */

/* ── Wireframe furniture, shared by all three ────────────────────────────── */

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.10)',
      background: 'linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
      padding: '14px',
      boxShadow: '0 30px 60px -30px rgba(0,0,0,0.8)',
    }}>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '14px' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: '6px', height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.20)' }} />
        ))}
      </div>
      {children}
    </div>
  )
}

/** A dim placeholder line, the wireframe's unit of text. */
function Bar({ w, bright = false }: { w: string | number; bright?: boolean }) {
  return (
    <span style={{
      display: 'block', height: '6px', width: typeof w === 'number' ? `${w}%` : w,
      borderRadius: '999px',
      background: bright ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.15)',
    }} />
  )
}

/** Rules being watched — the prop-firm panel. */
function WireRules() {
  return (
    <Chrome>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
        {[['62%', 62], ['24%', 24], ['21%', 21]].map(([, pct], i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
              <Bar w={i === 0 ? '38%' : i === 1 ? '30%' : '34%'} />
              <Bar w="14%" />
            </div>
            <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)' }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: '999px',
                background: i === 1 ? 'var(--ac, #4D8FFF)' : 'rgba(255,255,255,0.60)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </Chrome>
  )
}

/** One account leading several — the copier fan-out. */
function WireFanout() {
  return (
    <Chrome>
      <div style={{
        borderRadius: '8px', border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(255,255,255,0.06)', padding: '11px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
      }}>
        <Bar w="42%" bright />
        <Bar w="16%" />
      </div>

      {/* the split */}
      <div style={{ position: 'relative', height: '26px' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: '50%', width: '1px', background: 'rgba(255,255,255,0.18)' }} />
        <div style={{ position: 'absolute', left: '16%', right: '16%', top: '50%', height: '1px', background: 'rgba(255,255,255,0.18)' }} />
        {['16%', '50%', '84%'].map(l => (
          <div key={l} style={{ position: 'absolute', left: l, top: '50%', bottom: 0, width: '1px', background: 'rgba(255,255,255,0.18)' }} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            borderRadius: '8px', border: '1px solid rgba(255,255,255,0.09)',
            background: 'rgba(255,255,255,0.03)', padding: '11px 9px',
            display: 'flex', flexDirection: 'column', gap: '7px',
          }}>
            <Bar w="70%" />
            <Bar w="45%" />
          </div>
        ))}
      </div>
    </Chrome>
  )
}

/** Rows arriving on their own — the journal. */
function WireJournal() {
  return (
    <Chrome>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            borderRadius: '8px', padding: '10px 11px',
            background: i === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.022)',
            border: '1px solid rgba(255,255,255,0.07)',
            opacity: 1 - i * 0.18,
          }}>
            <span style={{
              width: '14px', height: '14px', borderRadius: '4px', flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.18)',
              background: i === 0 ? 'var(--ac, #4D8FFF)' : 'transparent',
            }} />
            <Bar w={i === 0 ? '52%' : `${46 - i * 6}%`} bright={i === 0} />
            <span style={{ marginLeft: 'auto' }}><Bar w="34px" /></span>
          </div>
        ))}
      </div>
    </Chrome>
  )
}

/* ── The section ─────────────────────────────────────────────────────────── */

const SOLUTIONS = [
  {
    title: 'Funded & prop traders',
    body: 'Rules you have to prove you followed. Daily loss limits, total drawdown and profit target watched live, with every trade timestamped against them — and a warning before you breach one, not after.',
    wire: <WireRules />,
  },
  {
    title: 'Traders running more than one account',
    body: 'One account leads, the rest follow in well under a second. Same broker or not, at 1:1, proportional, or a fixed lot you set per group.',
    wire: <WireFanout />,
  },
  {
    title: 'Anyone who stopped journaling',
    body: 'Because journaling by hand is admin, and admin loses to a live market. Nothing to fill in — it is already written by the time you close the platform.',
    wire: <WireJournal />,
  },
]

export function SolutionsStack() {
  return (
    <section id="solutions" style={{ padding: 'clamp(70px, 10vh, 120px) 0', scrollMarginTop: '90px' }}>
      <Shell>
        <div className="v2-sticky" style={{
          display: 'grid', gridTemplateColumns: '1fr 1.2fr',
          gap: 'clamp(30px, 5vw, 74px)', alignItems: 'start',
        }}>
          <div className="v2-sticky-head" style={{ position: 'sticky', top: 'clamp(90px, 18vh, 160px)' }}>
            <Reveal><Eyebrow>Solutions</Eyebrow></Reveal>
            <Reveal delay={70}>
              <H2 style={{ marginTop: '20px' }}>Built for how<br />you actually trade.</H2>
            </Reveal>
            <Reveal delay={140}>
              <Body style={{ marginTop: '20px', maxWidth: '38ch' }}>
                Not a spreadsheet with a dark theme. The work you would never do
                by hand, done for you between the close and the next session.
              </Body>
            </Reveal>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {SOLUTIONS.map((s, i) => (
              <div
                key={s.title}
                className="v2-stack-card"
                style={{
                  position: 'sticky',
                  top: `calc(clamp(90px, 18vh, 160px) + ${i * 18}px)`,
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  // Opaque, not translucent: a sliding stack needs each card to
                  // hide the one going under it.
                  background: 'linear-gradient(165deg, rgba(17,22,31,0.97), rgba(9,12,18,0.98))',
                  padding: 'clamp(26px, 3.2vw, 40px)',
                  boxShadow: '0 40px 80px -40px rgba(0,0,0,0.9)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(255,255,255,0.30)' }}>
                    0{i + 1}
                  </span>
                  <h3 style={{
                    margin: 0, fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(22px, 2.4vw, 34px)', lineHeight: 1.08,
                    letterSpacing: '-0.032em', color: '#fff',
                  }}>{s.title}</h3>
                </div>

                <div style={{ marginTop: 'clamp(22px, 2.6vw, 30px)' }}>{s.wire}</div>

                <Body style={{ marginTop: 'clamp(20px, 2.4vw, 26px)' }}>{s.body}</Body>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    </section>
  )
}
