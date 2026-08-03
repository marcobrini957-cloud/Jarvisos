'use client'

import { useState } from 'react'
import { Reveal } from './Reveal'
import { Eyebrow, H2, Body, PillLink, Glass, Shell } from './ui'
import { LogoMark } from '@/components/ui/LogoMark'
import { FAQS } from './faqData'

/**
 * The rest of the landing, ported from the live page into the v2 language.
 *
 * Every claim, number, price and answer here is carried over from the existing
 * landing verbatim — this is a redesign, not a rewrite. Where the old page put
 * a figure on screen (€12.99, 9 features, 6 FAQs, 8 brokers) the same figure is
 * on screen here.
 */

/* ── Brokers ─────────────────────────────────────────────────────────────── */

const BROKERS = ['IC Markets', 'Pepperstone', 'Blueberry', 'Vantage', 'FTMO', 'Eightcap', 'BlackBull', 'Axi']

export function BrokerStrip() {
  return (
    <section style={{ padding: 'clamp(80px, 11vh, 140px) 0' }}>
      <Shell>
        <Reveal><Eyebrow style={{ textAlign: 'center' }}>Works with every MT5 broker</Eyebrow></Reveal>
        <Reveal delay={80}>
          <H2 style={{ textAlign: 'center', margin: '20px auto 0', maxWidth: '18ch' }}>
            No new broker. No new platform.
          </H2>
        </Reveal>
        <div style={{
          display: 'grid', gap: '10px', marginTop: 'clamp(32px, 5vh, 54px)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        }}>
          {BROKERS.map((b, i) => (
            <Reveal key={b} delay={i * 45}>
              <Glass style={{
                height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: '15px',
                letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.78)',
              }}>{b}</Glass>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <p style={{
            margin: '18px 0 0', textAlign: 'center', fontFamily: 'var(--font-mono)',
            fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.32)',
          }}>+ any MT5 broker worldwide</p>
        </Reveal>
      </Shell>
    </section>
  )
}

/* ── Trader DNA ──────────────────────────────────────────────────────────── */

const DNA = [
  ['Decision Quality', 89], ['Discipline', 71], ['Emotional Stability', 64],
  ['Risk Consistency', 92], ['Patience', 58],
] as const

const DNA_TRAITS = [
  ['Impulsiveness', 'High'], ['Loss recovery', 'Poor'],
  ['Best window', '08:00–11:00'], ['Watch out', 'After two consecutive losses'],
] as const

export function TraderDnaBand() {
  return (
    <section style={{ padding: 'clamp(70px, 10vh, 120px) 0' }}>
      <Shell>
        <div className="v2-feature" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(30px, 5vw, 74px)', alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <Reveal><Eyebrow>Trader DNA</Eyebrow></Reveal>
            <Reveal delay={70}>
              <H2 style={{ marginTop: '20px' }}>The market has your number.<br />Now you have theirs.</H2>
            </Reveal>
            <Reveal delay={140}>
              <Body style={{ marginTop: '20px', maxWidth: '46ch' }}>
                Every trade feeds a living profile of how you actually trade — your
                discipline, your patience, your emotional stability, and the exact
                conditions where you give money back. It sharpens with every trade.
              </Body>
            </Reveal>
            <Reveal delay={210}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px', marginTop: '28px' }}>
                {DNA_TRAITS.map(([k, v]) => (
                  <div key={k} style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: '10px' }}>
                    <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.36)' }}>{k}</p>
                    <p style={{ margin: '5px 0 0', fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.86)' }}>{v}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={100} style={{ minWidth: 0 }}>
            <Glass style={{ padding: 'clamp(24px, 3vw, 36px)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>DNA score</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '34px', color: '#fff' }}>75</span>
              </div>
              <div style={{ marginTop: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {DNA.map(([label, v]) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.44)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.66)' }}>{v}</span>
                    </div>
                    <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ height: '100%', width: `${v}%`, background: v < 65 ? 'var(--color-warn, #E8980A)' : 'rgba(255,255,255,0.85)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </Glass>
          </Reveal>
        </div>
      </Shell>
    </section>
  )
}

/* ── Before / after ──────────────────────────────────────────────────────── */

const BEFORE = { label: 'Before', tag: 'No structure. No patterns. Just losses.', wr: '29%', pf: '0.72', pnl: '−€730' }
const AFTER  = { label: 'After',  tag: 'Every trade tracked. The edge is findable.', wr: '67%', pf: '2.4×', pnl: '+€1,847' }

function StatBlock({ d, dim }: { d: typeof BEFORE; dim?: boolean }) {
  return (
    <Glass style={{ padding: 'clamp(22px, 2.8vw, 32px)', opacity: dim ? 0.62 : 1 }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)' }}>{d.label}</p>
      <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,1.5vw,19px)', letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.88)' }}>{d.tag}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginTop: '24px' }}>
        {([['Win rate', d.wr], ['Profit factor', d.pf], ['Monthly P&L', d.pnl]] as const).map(([k, v]) => (
          <div key={k}>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>{k}</p>
            <p style={{
              margin: '6px 0 0', fontFamily: 'var(--font-mono)', fontSize: 'clamp(17px,1.8vw,23px)',
              color: k === 'Monthly P&L'
                ? (v.startsWith('+') ? 'var(--color-up, #00E87A)' : 'var(--color-down, #FF3347)')
                : '#fff',
            }}>{v}</p>
          </div>
        ))}
      </div>
    </Glass>
  )
}

export function BeforeAfterBand() {
  return (
    <section style={{ padding: 'clamp(70px, 10vh, 120px) 0' }}>
      <Shell>
        <Reveal><Eyebrow>The VELQUOR difference</Eyebrow></Reveal>
        <Reveal delay={70}><H2 style={{ marginTop: '20px', maxWidth: '20ch' }}>See what is working. Cut what is not.</H2></Reveal>
        <Reveal delay={140}>
          <Body style={{ marginTop: '20px', maxWidth: '58ch' }}>
            Your trades sync from MT5 by themselves — entry, stop, target, times, P&amp;L.
            You add the setup and how you felt. Ten seconds. That is the whole manual workload.
          </Body>
        </Reveal>

        <div className="v2-feature" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: 'clamp(32px, 5vh, 52px)' }}>
          <Reveal><StatBlock d={BEFORE} dim /></Reveal>
          <Reveal delay={110}><StatBlock d={AFTER} /></Reveal>
        </div>

        <Reveal delay={200}>
          <Glass style={{ marginTop: '18px', padding: 'clamp(22px, 2.8vw, 30px)' }}>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)' }}>VELQUOR found a pattern</p>
            <Body style={{ marginTop: '12px', color: 'rgba(255,255,255,0.80)' }}>
              ICT Order Block setups during London (08:00–11:00 CET) are your strongest
              edge — 78% win rate, average +€142. Your NY open trades show the opposite.
            </Body>
          </Glass>
        </Reveal>
      </Shell>
    </section>
  )
}

/* ── Everything in one place ─────────────────────────────────────────────── */

const FEATURES = [
  ['Auto-synced from MT5', 'Every trade, position and P&L syncs from your MT5 account in real time. No manual entry, no CSV uploads. Connect once and it runs forever.'],
  ['Built-in trade copier', 'Mirror every trade from your leader account to any number of followers in under two seconds. Proportional or fixed lot sizing, managed from your dashboard.'],
  ['AI behaviour analysis', 'Correlates your behaviour, your strategy and your habits across every trade — and surfaces the combinations that win and the ones that bleed.'],
  ['Session & setup analytics', 'Win rate broken down by London, New York and Asian session, and by every setup type you trade. Your real edge, in the numbers.'],
  ['Live TradingView charts', 'A full TradingView chart, live ticker tape and market overview built into your dashboard. Watch Gold and NAS100 without leaving your journal.'],
  ['Journal, habits & discipline', 'Daily journal with mood tracking, habit streaks, discipline scoring and AI-graded weekly reviews. Your routine and your P&L, finally connected.'],
  ['Prop firm tracker', 'Running a challenge? Prop Firm Mode watches every rule — max daily loss, drawdown, profit target — in real time.'],
  ['Market news & portfolio', 'Red-folder USD releases with live countdowns and plain-English briefs on what each number moves, plus a long-term portfolio tracker.'],
  ['PDF trade reports', 'A professional PDF for any date range. Weekly reviews, monthly summaries or a full account audit — formatted and ready to send.'],
]

export function FeatureGrid() {
  return (
    <section style={{ padding: 'clamp(70px, 10vh, 120px) 0' }}>
      <Shell>
        <Reveal><Eyebrow>Everything in one place</Eyebrow></Reveal>
        <Reveal delay={70}><H2 style={{ marginTop: '20px', maxWidth: '20ch' }}>Three core tools. One complete edge.</H2></Reveal>

        <div style={{
          display: 'grid', gap: '16px', marginTop: 'clamp(34px, 5vh, 54px)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        }}>
          {FEATURES.map(([title, body], i) => (
            <Reveal key={title} delay={(i % 3) * 90}>
              <Glass style={{ padding: 'clamp(22px, 2.4vw, 28px)', height: '100%' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.30)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 style={{ margin: '12px 0 0', fontFamily: 'var(--font-display)', fontSize: 'clamp(18px,1.7vw,21px)', letterSpacing: '-0.025em', color: '#fff' }}>{title}</h3>
                <Body style={{ marginTop: '10px', fontSize: '15px' }}>{body}</Body>
              </Glass>
            </Reveal>
          ))}
        </div>
      </Shell>
    </section>
  )
}

/* ── How it works ────────────────────────────────────────────────────────── */

const STEPS = [
  ['Create your free account', 'Email or Google in under 30 seconds. No card, no commitment.', 'Your data is isolated per account and encrypted from day one.'],
  ['Connect your MT5 account', 'Install the EA, paste your API key. Your entire trade history syncs by itself.', 'Works with every MT5 broker worldwide.'],
  ['See your real numbers', 'Your dashboard fills instantly — win rate, profit factor, P&L by instrument, session and day.', 'The biggest patterns and the costliest leaks surface immediately.'],
  ['Build a consistent process', 'Journal every trade, track habits, run weekly reviews.', 'Most traders find their biggest leak in the first week.'],
]

export function HowItWorksBand() {
  return (
    <section id="how" style={{ padding: 'clamp(70px, 10vh, 120px) 0', scrollMarginTop: '90px' }}>
      <Shell>
        <div className="v2-sticky" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 'clamp(30px, 5vw, 74px)', alignItems: 'start' }}>
          <div className="v2-sticky-head" style={{ position: 'sticky', top: 'clamp(90px, 18vh, 160px)' }}>
            <Reveal><Eyebrow>How it works</Eyebrow></Reveal>
            <Reveal delay={70}><H2 style={{ marginTop: '20px' }}>Up and running in under two minutes.</H2></Reveal>
            <Reveal delay={140}>
              <Body style={{ marginTop: '20px', maxWidth: '38ch' }}>
                No spreadsheets. No CSV exports. No manual entry. Connect MetaTrader and trade.
              </Body>
            </Reveal>
            <Reveal delay={210}>
              <div style={{ marginTop: '28px' }}><PillLink href="/login">Start your free account</PillLink></div>
            </Reveal>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {STEPS.map(([title, body, note], i) => (
              <Reveal key={title} delay={i * 70}>
                <div style={{ padding: 'clamp(22px, 2.6vw, 30px) 0', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.30)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-0.03em', color: '#fff' }}>{title}</h3>
                  <Body style={{ marginTop: '10px', fontSize: '16px' }}>{body}</Body>
                  <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.40)' }}>{note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Shell>
    </section>
  )
}

/* ── The Analyst ─────────────────────────────────────────────────────────── */

const ASKS = ['Why am I losing on Nasdaq?', "What's my best setup?", 'Am I overtrading?', 'How does mood affect my P&L?']

export function AnalystBand() {
  return (
    <section style={{ padding: 'clamp(70px, 10vh, 120px) 0' }}>
      <Shell>
        <div className="v2-feature" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(30px, 5vw, 74px)', alignItems: 'center', direction: 'rtl' }}>
          <div style={{ direction: 'ltr', minWidth: 0 }}>
            <Reveal><Eyebrow>The Analyst</Eyebrow></Reveal>
            <Reveal delay={70}><H2 style={{ marginTop: '20px' }}>An analyst that has read<br />every trade you took.</H2></Reveal>
            <Reveal delay={140}>
              <Body style={{ marginTop: '20px', maxWidth: '46ch' }}>
                Most analysis stops at P&amp;L. This goes three levels deeper — correlating
                how you felt, what you traded and when you traded it. Every number it
                quotes comes from your own fills, not a guess.
              </Body>
            </Reveal>
            <Reveal delay={210}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '26px' }}>
                {ASKS.map(q => (
                  <span key={q} style={{
                    padding: '9px 14px', borderRadius: '999px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
                    fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '-0.01em',
                    color: 'rgba(255,255,255,0.70)',
                  }}>{q}</span>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={100} style={{ direction: 'ltr', minWidth: 0 }}>
            <Glass style={{ padding: 'clamp(22px, 2.8vw, 30px)' }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.52)' }}>
                Why am I losing on Nasdaq?
              </p>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.10)', margin: '18px 0' }} />
              <Body style={{ color: 'rgba(255,255,255,0.86)' }}>
                Your NAS100 trades show a 38% win rate — below breakeven. Six of your
                eight losses came in the first 30 minutes after the New York open.
                You are trading the opening drive rather than waiting for it to resolve.
              </Body>
            </Glass>
          </Reveal>
        </div>
      </Shell>
    </section>
  )
}

/* ── Prop firm ───────────────────────────────────────────────────────────── */

const RULES = [
  ['Profit target', '6.8% / 10%', 68], ['Max daily loss', '1.2% / 5%', 24],
  ['Max drawdown', '2.1% / 10%', 21], ['Trading days', '7 / 10 days', 70],
] as const

export function PropFirmBand() {
  return (
    <section style={{ padding: 'clamp(70px, 10vh, 120px) 0' }}>
      <Shell>
        <div className="v2-feature" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(30px, 5vw, 74px)', alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <Reveal><Eyebrow>Prop firm mode</Eyebrow></Reveal>
            <Reveal delay={70}><H2 style={{ marginTop: '20px' }}>Also running<br />a challenge?</H2></Reveal>
            <Reveal delay={140}>
              <Body style={{ marginTop: '20px', maxWidth: '46ch' }}>
                Every rule of your challenge watched in real time — max daily loss, total
                drawdown, profit target, minimum trading days — and a warning before you
                break one, not after. FTMO, The Funded Trader, MyFundedFX, E8, or your own rules.
              </Body>
            </Reveal>
          </div>

          <Reveal delay={100} style={{ minWidth: 0 }}>
            <Glass style={{ padding: 'clamp(24px, 3vw, 34px)' }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)' }}>
                Challenge — phase 1
              </p>
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {RULES.map(([k, v, pct]) => (
                  <div key={k}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.62)' }}>{k}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(255,255,255,0.84)' }}>{v}</span>
                    </div>
                    <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(255,255,255,0.85)' }} />
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ margin: '20px 0 0', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.40)' }}>
                On track — 3 days to target at current pace
              </p>
            </Glass>
          </Reveal>
        </div>
      </Shell>
    </section>
  )
}

/* ── Trust ───────────────────────────────────────────────────────────────── */

const TRUST = [
  ['No passwords shared', 'The VELQUOR EA runs inside your own MT5 terminal. Your broker credentials never leave your machine — only trade data syncs, over a personal API key you can reset.'],
  ['EU infrastructure', 'Database and bridge both run on European servers. Your trading data never leaves the EU — GDPR-compliant by design.'],
  ['You own your data', 'Export every trade as PDF whenever you want. Delete your account and everything goes with it — no lock-in, no questions.'],
  ['Kill switch built in', 'Disconnect the EA or pause the copier with one click. You are always in control of what executes.'],
]

export function TrustBand() {
  return (
    <section style={{ padding: 'clamp(70px, 10vh, 120px) 0' }}>
      <Shell>
        <Reveal><Eyebrow>Built for trust</Eyebrow></Reveal>
        <Reveal delay={70}><H2 style={{ marginTop: '20px' }}>Your account stays yours.</H2></Reveal>
        <div style={{ display: 'grid', gap: '16px', marginTop: 'clamp(32px, 5vh, 50px)', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {TRUST.map(([t, b], i) => (
            <Reveal key={t} delay={i * 80}>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '18px', height: '100%' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(17px,1.6vw,20px)', letterSpacing: '-0.025em', color: '#fff' }}>{t}</h3>
                <Body style={{ marginTop: '10px', fontSize: '15px' }}>{b}</Body>
              </div>
            </Reveal>
          ))}
        </div>
      </Shell>
    </section>
  )
}

/* ── Pricing ─────────────────────────────────────────────────────────────── */

const ROWS = [
  'MT5 auto-sync', 'Trade journal', 'Core P&L & win rate stats', 'Live TradingView charts & market data',
  'Portfolio tracker', 'Red-folder news & economic calendar', 'Session analytics', 'Setup analytics',
  'VELQUOR AI analysis', 'Behaviour correlations', 'PDF trade reports', 'Prop firm tracker',
  'Trade copier', 'Priority support',
]

const TIERS = [
  {
    name: 'Free', monthly: '€0', annual: '€0', note: 'Free forever', cta: 'Start for free', popular: false,
    values: ['30-day history', 'Up to 100 trades', true, true, true, false, false, false, false, false, false, false, false, false],
  },
  {
    name: 'Pro', monthly: '€12.99', annual: '€10.39', note: 'Billed €155.88/year — save €36', cta: 'Start Pro', popular: true,
    values: ['Unlimited history', 'Unlimited', true, true, true, true, true, true, true, true, true, true, '1 group, 1 follower', false],
  },
  {
    name: 'Ultra', monthly: '€24.99', annual: '€19.99', note: 'Billed €299.88/year — save €72', cta: 'Start Ultra', popular: false,
    values: ['Unlimited history', 'Unlimited', true, true, true, true, true, true, true, true, true, true, '3 groups, 5 followers', true],
  },
]

export function PricingBand() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" style={{ padding: 'clamp(80px, 11vh, 140px) 0', scrollMarginTop: '90px' }}>
      <Shell>
        <Reveal><Eyebrow style={{ textAlign: 'center' }}>Plans</Eyebrow></Reveal>
        <Reveal delay={70}><H2 style={{ textAlign: 'center', margin: '20px auto 0' }}>Start free. Scale when ready.</H2></Reveal>
        <Reveal delay={130}>
          <Body style={{ textAlign: 'center', margin: '18px auto 0' }}>No card needed. Cancel any time.</Body>
        </Reveal>

        <Reveal delay={180}>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px' }}>
            <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
              {([['Monthly', false], ['Annual · save 20%', true]] as const).map(([label, v]) => (
                <button key={label} onClick={() => setAnnual(v)} style={{
                  padding: '9px 18px', borderRadius: '999px', cursor: 'pointer', border: 'none',
                  background: annual === v ? '#fff' : 'transparent',
                  color: annual === v ? '#000' : 'rgba(255,255,255,0.70)',
                  fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '-0.01em',
                  transition: 'background 250ms ease, color 250ms ease',
                }}>{label}</button>
              ))}
            </div>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gap: '16px', marginTop: 'clamp(32px, 5vh, 48px)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {TIERS.map((t, ti) => (
            <Reveal key={t.name} delay={ti * 90}>
              <Glass style={{
                padding: 'clamp(24px, 2.8vw, 32px)', height: '100%',
                display: 'flex', flexDirection: 'column',
                border: t.popular ? '1px solid rgba(255,255,255,0.26)' : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.52)' }}>{t.name}</span>
                  {t.popular && (
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000', background: '#fff', padding: '4px 9px', borderRadius: '999px' }}>Most popular</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '18px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(32px,3.4vw,44px)', color: '#fff' }}>{annual ? t.annual : t.monthly}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'rgba(255,255,255,0.44)' }}>/mo</span>
                </div>
                <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.40)', minHeight: '18px' }}>
                  {annual ? t.note : t.name === 'Free' ? 'Free forever' : 'Billed monthly'}
                </p>

                <div style={{ marginTop: '22px' }}>
                  <PillLink href="/login" variant={t.popular ? 'primary' : 'ghost'}>{t.cta}</PillLink>
                </div>

                <ul style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {ROWS.map((row, ri) => {
                    const v = t.values[ri]
                    const off = v === false
                    return (
                      <li key={row} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', opacity: off ? 0.34 : 1 }}>
                        <span aria-hidden style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: off ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)', width: '10px', flexShrink: 0 }}>
                          {off ? '–' : '✓'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.78)' }}>
                          {row}{typeof v === 'string' && <span style={{ color: 'rgba(255,255,255,0.44)' }}> · {v}</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </Glass>
            </Reveal>
          ))}
        </div>

        <Reveal delay={220}>
          <p style={{ margin: '22px 0 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.30)' }}>
            Prices in EUR. VAT may apply. Cancel any time — no questions asked.
          </p>
        </Reveal>
      </Shell>
    </section>
  )
}

/* ── FAQ ─────────────────────────────────────────────────────────────────── */


export function FaqBand() {
  return (
    <section style={{ padding: 'clamp(70px, 10vh, 120px) 0' }}>
      <Shell>
        <Reveal><Eyebrow>FAQ</Eyebrow></Reveal>
        <Reveal delay={70}><H2 style={{ marginTop: '20px' }}>Questions, answered.</H2></Reveal>
        <Reveal delay={130}>
          <Body style={{ marginTop: '18px' }}>Everything traders ask before connecting their first account.</Body>
        </Reveal>

        <div style={{ marginTop: 'clamp(32px, 5vh, 48px)' }}>
          {FAQS.map(([q, a], i) => (
            <Reveal key={q} delay={i * 55}>
              {/* <details> so it works with JS off and is keyboard-operable for free. */}
              <details className="v2-faq" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                <summary style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px',
                  padding: '22px 0', cursor: 'pointer', listStyle: 'none',
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,1.5vw,20px)',
                  letterSpacing: '-0.025em', color: '#fff',
                }}>
                  {q}
                  <span className="v2-faq-mark" aria-hidden style={{
                    flexShrink: 0, width: '26px', height: '26px', borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.18)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', color: 'rgba(255,255,255,0.70)',
                    transition: 'transform 350ms cubic-bezier(0.16,1,0.3,1)',
                  }}>+</span>
                </summary>
                <Body style={{ paddingBottom: '24px', maxWidth: '68ch', fontSize: '16px' }}>{a}</Body>
              </details>
            </Reveal>
          ))}
        </div>
      </Shell>
    </section>
  )
}

/* ── Footer ──────────────────────────────────────────────────────────────── */

export function FooterBand() {
  return (
    <footer style={{ padding: 'clamp(50px, 7vh, 80px) 0 clamp(40px, 6vh, 64px)', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
      <Shell>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-display)', fontSize: '15px', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.80)' }}>
            <LogoMark size={22} showBackground={false} />
            VELQUOR © 2026
          </span>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '22px' }}>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Impressum', '/impressum'], ['Pricing', '/pricing']].map(([l, h]) => (
              <a key={l} href={h} style={{
                fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '-0.01em',
                color: 'rgba(255,255,255,0.50)', textDecoration: 'none',
              }}>{l}</a>
            ))}
          </nav>
        </div>
        <p style={{ margin: '22px 0 0', fontFamily: 'var(--font-display)', fontSize: '11px', lineHeight: 1.6, color: 'rgba(255,255,255,0.30)', maxWidth: '80ch' }}>
          Medieninhaber &amp; Herausgeber: Marco Brini · Ägydygasse 14, 8020 Graz, Austria ·
          support@velquor.app · Angaben gemäß § 25 MedienG und § 5 ECG.
          Trading involves risk. VELQUOR is a journalling and analytics tool and does not
          provide financial advice.
        </p>
      </Shell>
    </footer>
  )
}
