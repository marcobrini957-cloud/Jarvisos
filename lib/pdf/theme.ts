import path from 'node:path'
import { Font } from '@react-pdf/renderer'

/**
 * The report's typography and palette — the product's own, not a PDF pastiche.
 *
 * It used to render in Helvetica on #0C0C12 with a blue accent, a gold logo
 * tile and score-coloured figures: the pre-2.0 palette, months after the app
 * stopped using it. A trader downloading a statement met a different company
 * than the one whose dashboard they had just been looking at.
 *
 * Fonts are the site's exact faces, decompressed from the woff2 in /public/fonts
 * to TTF because @react-pdf/renderer cannot read woff2. They are committed under
 * lib/pdf/fonts and pulled into the serverless bundle by
 * `outputFileTracingIncludes` in next.config.ts — without that the function
 * silently falls back to Helvetica in production while looking correct locally.
 */

const FONT_DIR = path.join(process.cwd(), 'lib', 'pdf', 'fonts')

let registered = false

/** Idempotent: @react-pdf keeps one global registry and re-registering warns. */
export function registerReportFonts() {
  if (registered) return
  registered = true

  // Words.
  Font.register({
    family: 'Coolvetica',
    fonts: [{ src: path.join(FONT_DIR, 'Coolvetica.ttf'), fontWeight: 400 }],
  })
  // The wordmark, and only the wordmark.
  Font.register({
    family: 'CoolveticaComp',
    fonts: [{ src: path.join(FONT_DIR, 'CoolveticaComp.ttf'), fontWeight: 400 }],
  })
  // Every figure.
  Font.register({
    family: 'JetBrainsMono',
    fonts: [
      { src: path.join(FONT_DIR, 'JetBrainsMono-Regular.ttf'),  fontWeight: 400 },
      { src: path.join(FONT_DIR, 'JetBrainsMono-SemiBold.ttf'), fontWeight: 600 },
    ],
  })

  // Coolvetica has no hyphenation dictionary here and @react-pdf will happily
  // break a setup name mid-word. Off entirely — a statement does not hyphenate.
  Font.registerHyphenationCallback(word => [word])
}

/** The 2.0 palette, matching app/globals.css. */
export const C = {
  void:    '#000000',
  surface: '#0A0A0A',
  raised:  '#111111',
  line:    '#242424',
  line2:   '#2E2E2E',
  ink1:    '#FFFFFF',
  ink2:    '#B8B8B8',
  ink3:    '#7A7A7A',
  ink4:    '#474747',
  /** Money moved, and nothing else. */
  up:      '#00C46A',
  down:    '#F0504B',
} as const

/** Words. */
export const WORDS = 'Coolvetica'
/** Figures — every one of them. */
export const MONO = 'JetBrainsMono'
/** The wordmark. */
export const MARK = 'CoolveticaComp'

/**
 * The label voice: 7pt, wide tracking, upper, ink-3. Used for every field name
 * in the report so the eye can skip them and land on the figures.
 */
export const label = {
  fontFamily: WORDS,
  fontSize: 6.5,
  letterSpacing: 1.1,
  color: C.ink3,
  textTransform: 'uppercase' as const,
}

/** A figure. `money` opts into the only colour the report is allowed to use. */
export function figure(size: number, opts?: { money?: number | null; dim?: boolean }) {
  const money = opts?.money
  return {
    fontFamily: MONO,
    fontSize: size,
    color:
      money == null || money === 0
        ? (opts?.dim ? C.ink3 : C.ink1)
        : money > 0 ? C.up : C.down,
  }
}
