'use client'

import { Surface } from '@/components/ui/vq'

// ── How It Works ─────────────────────────────────────────────────────────────
// A card like every other card. It used to draw its own box on the opaque
// legacy tokens (--s1 on --bd, a 12px corner) with its heading as micro-caps
// where every other panel has a title, so the one explanatory panel in the
// product was also the one panel that did not look like the product.
export function HowItWorks() {
  const steps = [
    { n: '1', title: 'Create a copy group',        desc: 'Set up a group with a name and lot sizing config (proportional or fixed).' },
    { n: '2', title: 'Connect your accounts',      desc: 'Add your leader (the one placing real trades) and your followers. Pick VELQUOR Cloud and enter login, broker server and password — we host the terminal for you, 24/7. Leaders work with the read-only investor password; followers need the trading password.' },
    { n: '3', title: 'Prefer your own MetaTrader?', desc: 'Choose "My own MetaTrader" instead: run VelquorBridge.mq5 on your machine with the EA configuration values shown on the group card (mode LEADER or FOLLOWER + the group ID).' },
    { n: '4', title: 'Trades mirror automatically', desc: 'When the leader opens or closes a trade, followers receive the signal and execute it — typically within a few seconds.' },
  ]
  return (
    <Surface title="How it works" padded>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {steps.map(s => (
          <div key={s.n} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'var(--color-surface-2)', border: '1px solid var(--color-line-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-ink-1)',
            }}>
              {s.n}
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-1)', marginBottom: '3px' }}>{s.title}</div>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-3)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  )
}
