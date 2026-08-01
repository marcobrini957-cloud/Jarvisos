import { Fragment, type ReactNode } from 'react'

/**
 * Emphasis for the claims that separate VELQUOR from everything else.
 *
 * The marketing copy is one long wall of ink-3 grey, and a visitor skimming it
 * has no way to find the four or five sentences that are actually the argument:
 * that nothing is typed in by hand, that a mirror lands in under two seconds,
 * that the credentials never leave their machine. Those phrases now carry
 * `--color-key`.
 *
 * Why key blue and not green: green and red mean money moved, everywhere in
 * this product, and a marketing claim is not money (see the colour rule in
 * DESIGN.md). `--color-key` is the token that already exists for "important,
 * not money" — it is what the signup button is painted with.
 *
 * The emphasis lives in the copy rather than in the components, written as
 * `[[double brackets]]`, so each of the four locales marks its own phrases —
 * the English span and the German span are rarely the same clause, and a
 * component-side list of phrases to highlight would only ever match English.
 */

const RE = /\[\[(.+?)\]\]/g

/** Splits `[[marked]]` copy into nodes. Plain text with no markers is returned as-is. */
export function mark(text: string): ReactNode {
  if (!text.includes('[[')) return text

  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  RE.lastIndex = 0

  while ((m = RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <span key={m.index} style={{ color: 'var(--color-key)' }}>{m[1]}</span>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))

  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>
}

/** Component form, for JSX that reads better wrapped than called. */
export function Mark({ children }: { children: string }) {
  return <>{mark(children)}</>
}
