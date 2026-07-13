'use client'

// ── How It Works ─────────────────────────────────────────────────────────────
export function HowItWorks() {
  const steps = [
    { n: '1', title: 'Create a Copy Group',      desc: 'Set up a group with a name and lot sizing config (proportional or fixed).' },
    { n: '2', title: 'Add your accounts',         desc: 'Add the MT5 account number for your master (the one placing real trades) and your slave accounts.' },
    { n: '3', title: 'Configure the EA',          desc: 'Copy the group ID shown above into VelquorBridge.mq5, set the mode to MASTER or SLAVE, and load it on each MT5.' },
    { n: '4', title: 'Trades mirror instantly',   desc: 'When the master opens or closes a trade, slaves receive the signal within 2 seconds and execute automatically.' },
  ]
  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px',
      padding: '20px', marginTop: '24px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.06em', marginBottom: '16px' }}>
        HOW IT WORKS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {steps.map(s => (
          <div key={s.n} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(122,79,255,0.15)', border: '1px solid rgba(122,79,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: 'var(--ac)',
            }}>
              {s.n}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', marginBottom: '3px' }}>{s.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
