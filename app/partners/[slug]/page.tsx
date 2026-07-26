import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PARTNERS, getPartner, ratingLabel } from '@/lib/partners'
import { getBrief, type BriefFact } from '@/lib/partnerBriefs'

// One page per partner, behind every "Learn more". Public on purpose: it is a
// review, and a review you have to log in to read is a sales page.
//
// The 2.0 design language lives under `.vq2` (see app/globals.css), which is
// normally applied by the dashboard shell — this route is outside it, so the
// wrapper opts in explicitly.

export function generateStaticParams() {
  return PARTNERS.map(p => ({ slug: p.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const partner = getPartner(slug)
  const brief   = getBrief(slug)
  if (!partner || !brief) return { title: 'Partner — Velquor' }
  return {
    title:       `${partner.name} — what it is, what it costs, what to watch · Velquor`,
    description: brief.whatItIs.slice(0, 155),
    robots:      { index: true, follow: true },
  }
}

const LABEL: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
  letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-ink-3)',
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-line-1)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-1)', margin: 0 }}>
          {title}
        </h2>
      </div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </section>
  )
}

function Facts({ facts }: { facts: BriefFact[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {facts.map((f, i) => (
        <div key={f.label} style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: '16px', padding: '7px 0',
          borderBottom: i === facts.length - 1 ? undefined : '1px solid var(--color-line-1)',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-2)' }}>
              {f.label}
              {f.theirClaim && (
                <span style={{ ...LABEL, marginLeft: '8px' }}>their figure</span>
              )}
            </div>
            {f.note && (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', marginTop: '2px', maxWidth: '70ch' }}>
                {f.note}
              </div>
            )}
          </div>
          <span className="vq-num" style={{ fontSize: 'var(--text-md)', color: 'var(--color-ink-1)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {f.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default async function PartnerBriefPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const partner = getPartner(slug)
  const brief   = getBrief(slug)
  if (!partner || !brief) notFound()

  const cta = (
    <a
      href={`/api/go/${partner.id}?slot=brief`}
      target="_blank" rel="sponsored noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        background: 'var(--color-action)', color: 'var(--color-action-ink)',
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
        textDecoration: 'none', padding: '8px 15px', borderRadius: 'var(--radius-sm)',
      }}
    >
      {partner.ctaLabel} ↗
    </a>
  )

  return (
    <div className="vq2" style={{ background: 'var(--color-void)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: 'clamp(16px, 3vw, 32px) clamp(14px, 3vw, 24px) 60px' }}>

        {/* ── Back ── */}
        <Link href="/dashboard" style={{ ...LABEL, display: 'inline-block', marginBottom: '18px', textDecoration: 'none' }}>
          ← Velquor · Partners
        </Link>

        {/* ── Header ── */}
        <header style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '20px', flexWrap: 'wrap', marginBottom: '10px',
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 4vw, 34px)',
              color: 'var(--color-ink-1)', margin: 0, letterSpacing: '0.01em',
            }}>
              {partner.name}
            </h1>
            <p style={{ ...LABEL, margin: '6px 0 0' }}>{brief.kind}</p>
          </div>
          {partner.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partner.logo} alt={`${partner.name} logo`}
              style={{ height: '46px', maxWidth: '210px', objectFit: 'contain', objectPosition: 'right top' }} />
          )}
        </header>

        {/* ── Meta line ── */}
        <div style={{
          display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'baseline',
          padding: '10px 0 16px', borderBottom: '1px solid var(--color-line-1)', marginBottom: '18px',
        }}>
          {brief.since && <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-2)' }}>{brief.since}</span>}
          {brief.based && <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-3)' }}>{brief.based}</span>}
          {partner.rating != null && (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
              <span className="vq-num" style={{ fontSize: 'var(--text-md)', color: 'var(--color-ink-1)' }}>{partner.rating.toFixed(1)}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-2)' }}>
                {ratingLabel(partner.rating)}
              </span>
              {partner.ratingSource && <span style={LABEL}>on {partner.ratingSource}</span>}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* ── What it is ── */}
          <Panel title="What it is">
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', lineHeight: 1.6, color: 'var(--color-ink-1)' }}>
              {brief.whatItIs}
            </p>
          </Panel>

          {/* ── Why it is in the product ── */}
          <Panel title="In Velquor">
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', lineHeight: 1.6, color: 'var(--color-ink-2)' }}>
              {brief.inVelquor}
            </p>
          </Panel>

          {/* ── Body sections ── */}
          {brief.sections.map(s => (
            <Panel key={s.heading} title={s.heading}>
              {s.body && (
                <p style={{
                  margin: s.facts ? '0 0 10px' : 0, fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)', lineHeight: 1.6, color: 'var(--color-ink-2)',
                }}>
                  {s.body}
                </p>
              )}
              {s.facts && <Facts facts={s.facts} />}
              {s.bullets && (
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {s.bullets.map(b => (
                    <li key={b} style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', lineHeight: 1.55, color: 'var(--color-ink-2)' }}>{b}</li>
                  ))}
                </ul>
              )}
            </Panel>
          ))}

          {/* ── Regulation ── */}
          <Panel title="Who regulates it">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {brief.regulation.map((r, i) => (
                <div key={r.entity} style={{
                  paddingBottom: '10px',
                  borderBottom: i === brief.regulation.length - 1 ? undefined : '1px solid var(--color-line-1)',
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', color: 'var(--color-ink-1)' }}>{r.entity}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-2)', marginTop: '2px' }}>{r.regulator}</div>
                  <div className="vq-num" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-3)', marginTop: '3px' }}>{r.licence}</div>
                  {r.address && <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', marginTop: '2px' }}>{r.address}</div>}
                </div>
              ))}
            </div>
            {brief.moneyNote && (
              <p style={{
                margin: '10px 0 0', padding: '9px 11px',
                background: 'var(--color-surface-1)', borderLeft: '2px solid var(--color-line-3)',
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', lineHeight: 1.55,
                color: 'var(--color-ink-2)',
              }}>
                {brief.moneyNote}
              </p>
            )}
          </Panel>

          {/* ── Watch-outs — the reason this page exists ── */}
          <section style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-line-1)',
            borderLeft: '2px solid var(--color-down)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--color-line-1)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-down)', margin: 0 }}>
                What to watch
              </h2>
            </div>
            <ul style={{ margin: 0, padding: '12px 14px 12px 32px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {brief.watchOuts.map(w => (
                <li key={w} style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', lineHeight: 1.6, color: 'var(--color-ink-1)' }}>{w}</li>
              ))}
            </ul>
          </section>

          {/* ── CTA ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
            padding: '14px', background: 'var(--color-surface-1)',
            border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-md)',
          }}>
            {cta}
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)' }}>
              Affiliate link — Velquor may earn a commission, at no extra cost to you.
            </span>
          </div>

          {/* ── Sources ── */}
          <Panel title="Sources">
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {brief.sources.map(s => (
                <li key={s.url} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-1)', textDecoration: 'underline', textDecorationColor: 'var(--color-line-3)' }}>
                    {s.label}
                  </a>
                  <span style={LABEL}>checked {s.checked}</span>
                </li>
              ))}
            </ul>
            <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', lineHeight: 1.6, color: 'var(--color-ink-4)' }}>
              Figures marked <span style={LABEL}>their figure</span>{' '}are the partner&apos;s own published claims and are not independently audited.
              Prices, spreads, licences and ratings change — verify anything you are about to act on at the source.
              Nothing here is financial advice, and trading leveraged products carries a high risk of loss.
            </p>
          </Panel>

        </div>
      </div>
    </div>
  )
}
