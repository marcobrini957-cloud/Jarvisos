'use client'

import Link from 'next/link'

/**
 * Shared pieces for the second landing direction.
 *
 * The type scale is lifted from the measurements taken off the reference, not
 * guessed: headings at -0.035em tracking with line-height ~1.05, body at 20px
 * in a light weight with -0.015em, and eyebrows tiny with +0.3em. That pairing
 * — very tight headings against very loose micro-caps — is most of the
 * "expensive" feeling, and it costs nothing to apply consistently.
 *
 * Radii are 8 and 12 and 999 only. The old landing had nine different values,
 * which is what unconsidered looks like up close.
 */

export const MAXW = '1240px'

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: '12px',
      letterSpacing: '0.30em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.40)',
      ...style,
    }}>{children}</p>
  )
}

export function H2({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(30px, 3.9vw, 56px)',
      lineHeight: 1.04,
      letterSpacing: '-0.035em',
      color: '#fff',
      textWrap: 'balance',
      ...style,
    }}>{children}</h2>
  )
}

export function Body({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(16px, 1.35vw, 19px)',
      lineHeight: 1.45,
      letterSpacing: '-0.015em',
      color: 'rgba(255,255,255,0.66)',
      ...style,
    }}>{children}</p>
  )
}

/** White solid, with the circled arrow the reference puts on every primary. */
export function PillLink({ href, children, variant = 'primary' }: {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'ghost' | 'dark'
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '10px',
    borderRadius: '999px', textDecoration: 'none', whiteSpace: 'nowrap',
    fontFamily: 'var(--font-display)', fontSize: '15px', letterSpacing: '-0.01em',
    transition: 'transform 400ms cubic-bezier(0.16,1,0.3,1), background 300ms ease',
  }
  if (variant === 'ghost') {
    return (
      <Link href={href} className="v2-pill" style={{
        ...base, padding: '13px 22px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.13)',
        color: '#fff',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      }}>{children}</Link>
    )
  }
  const dark = variant === 'dark'
  return (
    <Link href={href} className="v2-pill" style={{
      ...base, padding: '13px 12px 13px 22px',
      background: dark ? '#000' : '#fff',
      border: dark ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
      color: dark ? '#fff' : '#000',
    }}>
      {children}
      <span aria-hidden style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '24px', height: '24px', borderRadius: '999px',
        background: dark ? '#fff' : '#000', color: dark ? '#000' : '#fff',
        fontSize: '11px', lineHeight: 1,
      }}>→</span>
    </Link>
  )
}

/** The translucent panel the reference uses for every card and logo tile. */
export function Glass({ children, style, className }: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div className={className} style={{
      background: 'rgba(255,255,255,0.045)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '12px',
      backdropFilter: 'blur(26px)', WebkitBackdropFilter: 'blur(26px)',
      ...style,
    }}>{children}</div>
  )
}

/** Consistent page gutter + max width for every band on the page. */
export function Shell({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: '100%', maxWidth: MAXW, margin: '0 auto',
      padding: '0 clamp(20px, 4vw, 44px)',
      ...style,
    }}>{children}</div>
  )
}
