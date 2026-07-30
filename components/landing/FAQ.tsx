'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { Section, SectionHead } from './Section'

/**
 * The questions.
 *
 * Eight rounded cards that each turned blue when opened became one list on
 * hairlines. The plus that rotates 45° into a cross is kept — that is motion
 * describing a state change, which the ban list allows and asks for.
 */
export function FAQ() {
  const { t } = useLocale()
  const f = t.faq
  const [open, setOpen] = useState<number | null>(0)

  return (
    <Section id="faq">
      <SectionHead label={f.eyebrow} title={f.h2} lead={f.subtitle} />

      <div style={{ maxWidth: '860px' }}>
        {f.items.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={i} style={{ borderTop: '1px solid var(--color-line-1)' }}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                  width: '100%', padding: '16px 2px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
                  color: isOpen ? 'var(--color-ink-1)' : 'var(--color-ink-2)',
                  lineHeight: 1.4, transition: 'color 0.15s',
                }}>
                  {item.q}
                </span>
                <span aria-hidden style={{
                  color: 'var(--color-ink-3)', fontSize: 'var(--text-lg)', flexShrink: 0,
                  transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s',
                  lineHeight: 1,
                }}>+</span>
              </button>
              <div style={{
                display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.25s ease',
              }}>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{
                    margin: 0, padding: '0 2px 18px', maxWidth: '68ch',
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                    lineHeight: 1.7, color: 'var(--color-ink-3)',
                  }}>
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
