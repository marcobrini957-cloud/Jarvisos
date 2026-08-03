'use client'

import { useEffect, useRef, useState } from 'react'
import { Reveal } from './Reveal'
import { Eyebrow, H2, Body, PillLink, Glass, Shell } from './ui'

/* ───────────────────────────────────────────────────────────────────────────
   Proof strip

   The reference puts a row of client logos here — Nike, Google, Prada — which
   are placeholders in a template demo. VELQUOR has three real users, so
   borrowing that pattern would mean inventing customers. What it does have is
   true and more relevant to a trader deciding whether this will work with
   their setup: what it connects to.
   ─────────────────────────────────────────────────────────────────────────── */

const WORKS_WITH = [
  'MetaTrader 5', 'Any MT5 broker', 'Prop / funded accounts',
  'TradingView charts', 'Desktop or VPS', 'Phone-only traders',
]

export function ProofStrip() {
  return (
    <section style={{ padding: 'clamp(90px, 12vh, 150px) 0' }}>
      <Shell>
        <Reveal><Eyebrow style={{ textAlign: 'center' }}>Works with what you already use</Eyebrow></Reveal>
        <Reveal delay={80}>
          <H2 style={{ textAlign: 'center', margin: '20px auto 0', maxWidth: '18ch' }}>
            No new broker. No new platform.
          </H2>
        </Reveal>

        <div style={{
          display: 'grid', gap: '10px', marginTop: 'clamp(34px, 5vh, 56px)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        }}>
          {WORKS_WITH.map((w, i) => (
            <Reveal key={w} delay={i * 55}>
              <Glass style={{
                height: '86px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 16px', textAlign: 'center',
                fontFamily: 'var(--font-display)', fontSize: '15px',
                letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.80)',
              }}>{w}</Glass>
            </Reveal>
          ))}
        </div>
      </Shell>
    </section>
  )
}

/* ───────────────────────────────────────────────────────────────────────────
   Feature rows — alternating, exactly the reference's rhythm:
   eyebrow / large heading / body / pill CTA on one side, a visual on the other.
   ─────────────────────────────────────────────────────────────────────────── */

export function FeatureRow({
  index, eyebrow, heading, body, cta, href, flip = false, visual,
}: {
  index: string
  eyebrow: string
  heading: React.ReactNode
  body: string
  cta: string
  href: string
  flip?: boolean
  visual: React.ReactNode
}) {
  return (
    <section style={{ padding: 'clamp(60px, 9vh, 110px) 0' }}>
      <Shell>
        <div className="v2-feature" style={{
          display: 'grid', gap: 'clamp(30px, 5vw, 74px)', alignItems: 'center',
          gridTemplateColumns: '1fr 1fr',
          direction: flip ? 'rtl' : 'ltr',
        }}>
          <div style={{ direction: 'ltr', minWidth: 0 }}>
            <Reveal><Eyebrow>{eyebrow}</Eyebrow></Reveal>
            <Reveal delay={70}><H2 style={{ marginTop: '20px' }}>{heading}</H2></Reveal>
            <Reveal delay={140}><Body style={{ marginTop: '20px', maxWidth: '46ch' }}>{body}</Body></Reveal>
            <Reveal delay={210}>
              <div style={{ marginTop: 'clamp(24px, 3vh, 34px)' }}>
                <PillLink href={href} variant="dark">{cta}</PillLink>
              </div>
            </Reveal>
          </div>

          <Reveal delay={100} style={{ direction: 'ltr', minWidth: 0 }}>
            <Glass className="v2-visual" style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4 / 3' }}>
              <span style={{
                position: 'absolute', top: '18px', left: '20px', zIndex: 2,
                fontFamily: 'var(--font-mono)', fontSize: '12px',
                color: 'rgba(255,255,255,0.34)', letterSpacing: '0.08em',
              }}>{index}</span>
              {visual}
            </Glass>
          </Reveal>
        </div>
      </Shell>
    </section>
  )
}

/* ───────────────────────────────────────────────────────────────────────────
   Sticky stacked cards

   The reference pins a column of glass cards so each one settles over the last
   as you scroll, against a heading that stays put on the left. Pure CSS
   position:sticky — no scroll library needed, so it degrades to a plain stack
   on browsers that ignore it.
   ─────────────────────────────────────────────────────────────────────────── */

const AUDIENCES = [
  {
    title: 'Funded & prop traders',
    body: 'Rules you have to prove you followed. Daily loss limits, consistency, and every trade timestamped against them — before the firm asks.',
  },
  {
    title: 'Traders running more than one account',
    body: 'One account leads, the rest follow in under two seconds. Same broker or not, at 1:1 or your own multiplier.',
  },
  {
    title: 'Anyone who stopped journaling',
    body: 'Because journaling by hand is admin, and admin loses to a live market. Nothing to fill in — it is already written when you close the platform.',
  },
]

export function StickyAudiences() {
  return (
    <section style={{ padding: 'clamp(70px, 10vh, 120px) 0' }}>
      <Shell>
        <div className="v2-sticky" style={{
          display: 'grid', gridTemplateColumns: '1fr 1.15fr',
          gap: 'clamp(30px, 5vw, 74px)', alignItems: 'start',
        }}>
          <div className="v2-sticky-head" style={{ position: 'sticky', top: 'clamp(90px, 18vh, 160px)' }}>
            <Reveal><Eyebrow>Who it is for</Eyebrow></Reveal>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {AUDIENCES.map((a, i) => (
              <Glass
                key={a.title}
                className="v2-stack-card"
                style={{
                  position: 'sticky',
                  top: `calc(clamp(90px, 18vh, 160px) + ${i * 16}px)`,
                  padding: 'clamp(26px, 3.4vw, 40px)',
                  // Each card needs its own backdrop, or the one beneath shows
                  // through as it slides under.
                  background: 'rgba(10,13,18,0.82)',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em',
                }}>0{i + 1}</span>
                <h3 style={{
                  margin: '14px 0 0', fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(22px, 2.3vw, 32px)', lineHeight: 1.1,
                  letterSpacing: '-0.03em', color: '#fff',
                }}>{a.title}</h3>
                <Body style={{ marginTop: '14px' }}>{a.body}</Body>
              </Glass>
            ))}
          </div>
        </div>
      </Shell>
    </section>
  )
}

/* ───────────────────────────────────────────────────────────────────────────
   Closing CTA
   ─────────────────────────────────────────────────────────────────────────── */

export function ClosingCTA() {
  return (
    <section style={{ padding: 'clamp(100px, 16vh, 190px) 0 clamp(70px, 10vh, 120px)' }}>
      <Shell style={{ textAlign: 'center' }}>
        <Reveal><Eyebrow style={{ textAlign: 'center' }}>Start free</Eyebrow></Reveal>
        <Reveal delay={80}>
          <H2 style={{
            margin: '22px auto 0', maxWidth: '16ch',
            fontSize: 'clamp(36px, 5.6vw, 78px)',
          }}>
            Your next trade is already being logged.
          </H2>
        </Reveal>
        <Reveal delay={150}>
          <Body style={{ margin: '22px auto 0', maxWidth: '46ch' }}>
            Connect MetaTrader once. Everything after that happens without you.
          </Body>
        </Reveal>
        <Reveal delay={220}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'clamp(28px, 4vh, 40px)' }}>
            <PillLink href="/login">Start free</PillLink>
            <PillLink href="/pricing" variant="ghost">See pricing</PillLink>
          </div>
        </Reveal>
        <Reveal delay={280}>
          <p style={{
            margin: '18px 0 0', fontFamily: 'var(--font-mono)',
            fontSize: '11px', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.30)',
          }}>No card required · Works with any MT5 broker</p>
        </Reveal>
      </Shell>
    </section>
  )
}

/* ───────────────────────────────────────────────────────────────────────────
   Feature visuals — drawn, not screenshotted.

   The reference fills these panels with abstract renders. A raw dashboard
   screenshot at this size reads as documentation; these read as product.
   ─────────────────────────────────────────────────────────────────────────── */

/** A trade log filling itself in, one row at a time. */
export function VisualAutoSync() {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(5); return }
    let iv = 0
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !iv) {
        iv = window.setInterval(() => setN(v => (v >= 5 ? 0 : v + 1)), 900)
      } else if (!e.isIntersecting && iv) {
        clearInterval(iv); iv = 0
      }
    }, { threshold: 0.3 })
    io.observe(el)
    return () => { clearInterval(iv); io.disconnect() }
  }, [])

  const rows = [
    ['XAUUSD', 'buy',  '+128.40'],
    ['EURUSD', 'sell', '−42.10'],
    ['US30',   'buy',  '+310.75'],
    ['GBPUSD', 'sell', '+66.20'],
    ['BTCUSD', 'buy',  '−98.00'],
  ]

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, padding: '54px 20px 20px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {rows.map((r, i) => {
        const on = i < n
        const pos = !r[2].startsWith('−')
        return (
          <div key={r[0]} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'center',
            padding: '10px 12px', borderRadius: '8px',
            background: on ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.06)',
            opacity: on ? 1 : 0.22,
            transform: on ? 'none' : 'translateY(5px)',
            transition: 'all 620ms cubic-bezier(0.16,1,0.3,1)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(255,255,255,0.78)' }}>{r[0]}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'rgba(255,255,255,0.34)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{r[1]}</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px',
              color: on ? (pos ? 'var(--color-up, #00E87A)' : 'var(--color-down, #FF3347)') : 'rgba(255,255,255,0.2)',
            }}>{r[2]}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Six behaviour scores settling into place. */
export function VisualAnalysis() {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setOn(true), io.disconnect()), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const bars = [
    ['Discipline', 88], ['Consistency', 70], ['Risk', 34],
    ['Win rate', 67], ['Mindset', 92], ['Profit factor', 78],
  ] as const

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, padding: '54px 22px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '15px' }}>
      {bars.map(([label, v], i) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)' }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.62)' }}>{v}</span>
          </div>
          <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)' }}>
            <div style={{
              height: '100%', width: on ? `${v}%` : '0%',
              background: v < 45 ? 'var(--color-warn, #E8980A)' : 'rgba(255,255,255,0.85)',
              transition: `width 1100ms cubic-bezier(0.16,1,0.3,1) ${i * 90}ms`,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A signal crossing from one account to another. */
export function VisualCopier() {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setOn(true); return }
    let iv = 0
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !iv) iv = window.setInterval(() => setOn(v => !v), 2100)
      else if (!e.isIntersecting && iv) { clearInterval(iv); iv = 0 }
    }, { threshold: 0.3 })
    io.observe(el)
    return () => { clearInterval(iv); io.disconnect() }
  }, [])

  const node = (label: string, sub: string) => (
    <div style={{
      flex: 1, padding: '18px 16px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.10)',
    }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>{label}</p>
      <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'rgba(255,255,255,0.82)' }}>{sub}</p>
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, padding: '54px 22px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px' }}>
      {node('Leader', 'XAUUSD · 0.50 · buy')}
      <div style={{ position: 'relative', height: '38px' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.14)' }} />
        <div style={{
          position: 'absolute', left: '50%', marginLeft: '-3px',
          top: on ? 'calc(100% - 6px)' : '0px',
          width: '6px', height: '6px', borderRadius: '999px', background: '#fff',
          transition: 'top 1500ms cubic-bezier(0.5,0,0.2,1)',
        }} />
      </div>
      {node('Follower', on ? 'XAUUSD · 0.50 · filled' : 'waiting…')}
      <p style={{ margin: '4px 0 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.30)' }}>
        measured 0.3–0.55s delivery
      </p>
    </div>
  )
}
