'use client'

import { Reveal } from './Reveal'
import { Shell } from './ui'

/**
 * The proof band from the old landing, with defensible numbers.
 *
 * ⚠️ The originals were placeholders and are NOT carried over verbatim:
 *   "50,000+ trades tracked"    — the database holds a few hundred.
 *   "+23% avg win rate uplift"  — an efficacy claim with no study behind it.
 *   "1.2s MT5 sync time"        — matches nothing we have measured.
 *   "12 AI insights per week"   — arbitrary.
 *
 * A landing page for a financial product in the EU is the wrong place to
 * invent numbers, and it contradicts the rule the whole product is built on:
 * a figure on screen has to be true. These four are things we have actually
 * measured or that are structurally true, so they survive being asked about.
 */
const FIGURES: { value: string; label: string }[] = [
  { value: '0.3–0.55s', label: 'Copier signal to delivery' },
  { value: '10s',       label: 'Account sync interval' },
  { value: '30 days',   label: 'History imported on connect' },
  { value: 'Any MT5',   label: 'Broker requirement' },
]

export function StatsBand() {
  return (
    <section style={{
      borderTop: '1px solid rgba(255,255,255,0.10)',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
      background: 'rgba(5,7,10,0.55)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }}>
      <Shell>
        <div className="v2-stats">
          {FIGURES.map((f, i) => (
            <Reveal key={f.label} delay={i * 70}>
              <div style={{ padding: 'clamp(20px, 2.6vw, 30px) 0' }}>
                <p style={{
                  margin: 0, fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(20px, 2.4vw, 30px)', lineHeight: 1,
                  letterSpacing: '-0.02em', color: '#fff',
                }}>{f.value}</p>
                <p style={{
                  margin: '10px 0 0', fontFamily: 'var(--font-display)',
                  fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.38)',
                }}>{f.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Shell>
    </section>
  )
}
