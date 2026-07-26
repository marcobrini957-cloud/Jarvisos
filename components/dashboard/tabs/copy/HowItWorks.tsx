'use client'

// ── How It Works ─────────────────────────────────────────────────────────────
export function HowItWorks() {
  const steps = [
    { n: '1', title: 'Create a Copy Group',      desc: 'Set up a group with a name and lot sizing config (proportional or fixed).' },
    { n: '2', title: 'Connect your accounts',     desc: 'Add your leader (the one placing real trades) and your followers. Pick VELQUOR Cloud and enter login, broker server and password — we host the terminal for you, 24/7. Leaders work with the read-only investor password; followers need the trading password.' },
    { n: '3', title: 'Prefer your own MetaTrader?', desc: 'Choose "My own MetaTrader" instead: run VelquorBridge.mq5 on your machine with the EA CONFIGURATION values shown on the group card (mode LEADER or FOLLOWER + the group ID).' },
    { n: '4', title: 'Trades mirror automatically', desc: 'When the leader opens or closes a trade, followers receive the signal and execute it — typically within a few seconds.' },
  ]
  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--radius-xl)',
      padding: '20px', marginTop: '24px',
    }}>
      <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.06em', marginBottom: '16px' }}>
        HOW IT WORKS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {steps.map(s => (
          <div key={s.n} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'var(--color-surface-3)', border: '1px solid var(--color-line-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-ink-1)',
            }}>
              {s.n}
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--t1)', marginBottom: '3px' }}>{s.title}</div>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--t3)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
