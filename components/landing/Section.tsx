import type { CSSProperties, ReactNode } from 'react'
import { mark } from './Mark'

/**
 * The marketing page's two structural primitives.
 *
 * Every section used to open the same way: a glowing accent pill, a centred
 * 900-classic headline, a centred subhead under it. DESIGN.md §2 bans that
 * opener by name — it is the single most recognisable template signature on
 * the web, and we were running it eleven times down one page.
 *
 * `SectionHead` is the replacement: ranged left on the page margin, the eyebrow
 * demoted to the label voice, hierarchy from size and ink. `Section` carries
 * the page's horizontal rhythm so no section invents its own.
 */

export const PAGE_X = 'clamp(14px, 4vw, 32px)'

export function Section({ id, band = false, children, style }: {
  id?: string
  /** A banded section sits on surface-1 between two hairlines. */
  band?: boolean
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <section
      id={id}
      style={{
        padding: `clamp(52px, 7vw, 92px) ${PAGE_X}`,
        background: band ? 'var(--s1)' : 'var(--color-void)',
        borderTop: band ? '1px solid var(--color-line-1)' : undefined,
        borderBottom: band ? '1px solid var(--color-line-1)' : undefined,
        ...style,
      }}
    >
      {children}
    </section>
  )
}

export function SectionHead({ label, title, lead, action }: {
  label: string
  title: ReactNode
  lead?: ReactNode
  action?: ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: '24px', flexWrap: 'wrap', marginBottom: 'clamp(28px, 4vw, 44px)',
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--color-ink-3)', margin: '0 0 14px',
        }}>
          {label}
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(var(--text-3xl), 3.6vw, var(--text-d2))', lineHeight: 1.02,
          letterSpacing: '-0.03em', color: 'var(--color-ink-1)',
          margin: 0, maxWidth: '22ch',
        }}>
          {typeof title === 'string' ? mark(title) : title}
        </h2>
        {lead && (
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
            lineHeight: 1.6, color: 'var(--color-ink-3)',
            margin: '14px 0 0', maxWidth: '56ch',
          }}>
            {typeof lead === 'string' ? mark(lead) : lead}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

/** Ink on void — the one button on the marketing site, same as the nav's. */
export const inkButton: CSSProperties = {
  background: 'var(--color-ink-1)', color: 'var(--color-void)',
  fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
  textDecoration: 'none', padding: '11px 22px',
  borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
  display: 'inline-block',
}

/** The quieter one, for a second action next to it. */
export const lineButton: CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
  color: 'var(--color-ink-2)', textDecoration: 'none',
  padding: '11px 18px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-line-2)', whiteSpace: 'nowrap',
  display: 'inline-block',
}
