/**
 * Renders public/og.png — the card every shared VELQUOR link unfurls into.
 *
 * There was no `og:image` at all while `twitter:card` claimed
 * `summary_large_image`, so a link pasted into a Discord or a Telegram group
 * rendered as a bare text stub. For a product that spreads trader-to-trader
 * that is a conversion tax paid on every share.
 *
 * It is a screenshot rather than a hand-drawn PNG or a `next/og` route on
 * purpose: satori (what `next/og` runs on) cannot read woff2, which is the only
 * format the licensed faces ship in here — an ImageResponse card would have had
 * to be set in a system font, i.e. in the one typeface the whole redesign
 * exists to avoid. Rendering it in the same browser with the same stylesheet
 * means the card is always the product's own type.
 *
 *   npm i -D playwright-core --no-save && node scripts/og.mjs
 *
 * playwright-core is deliberately not a dependency — it would be installed on
 * every Vercel build to serve a script that runs by hand once a quarter. It
 * drives the system Chrome, so no browser download either.
 *
 * Re-run it when the wordmark, the palette or the headline changes.
 */

let chromium
try {
  ({ chromium } = await import('playwright-core'))
} catch {
  console.error('needs playwright-core:  npm i -D playwright-core --no-save && node scripts/og.mjs')
  process.exit(1)
}
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const b64 = f => readFileSync(join(root, 'public/fonts', f)).toString('base64')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'Coolvetica'; src: url(data:font/woff2;base64,${b64('coolvetica-regular.woff2')}) format('woff2'); font-weight: 400 }
  @font-face { font-family: 'Coolvetica Comp'; src: url(data:font/woff2;base64,${b64('coolvetica-heavycomp.woff2')}) format('woff2'); font-weight: 700 }
  @font-face { font-family: 'JetBrains Mono'; src: url(data:font/woff2;base64,${b64('jetbrains-mono-400.woff2')}) format('woff2'); font-weight: 400 }
  * { margin: 0; padding: 0; box-sizing: border-box }
  body {
    width: 1200px; height: 630px; background: #000; color: #fff;
    font-family: 'Coolvetica', sans-serif;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 64px 72px;
    -webkit-font-smoothing: antialiased;
  }
  .mark { display: flex; align-items: center; gap: 14px }
  .word { font-family: 'Coolvetica Comp'; font-size: 40px; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1 }
  h1 { font-size: 84px; line-height: 0.98; letter-spacing: -0.035em; font-weight: 400; max-width: 15ch }
  .dim { color: rgba(255,255,255,0.72) }
  .rule { height: 1px; background: rgba(255,255,255,0.08) }
  .foot { display: flex; align-items: baseline; gap: 28px; padding-top: 22px }
  .lbl { font-size: 15px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.48) }
  .num { font-family: 'JetBrains Mono', monospace; font-size: 15px; letter-spacing: -0.02em; color: #fff }
</style></head><body>
  <div class="mark">
    <!-- The mark, copied path-for-path from components/ui/LogoMark.tsx so the
         card cannot drift from the product's own logo. -->
    <svg width="38" height="38" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="vq-ink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.5"/>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="14" fill="#04060A"/>
      <rect x="1.5" y="1.5" width="61" height="61" rx="13.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.13"/>
      <circle cx="31" cy="34" r="23" fill="none" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="1"/>
      <path d="M 12 18 L 21 18 L 31.6 42.8 L 43 18 L 46.5 18 L 33.2 48 L 28.2 48 Z" fill="url(#vq-ink)"/>
      <circle cx="51" cy="14.5" r="4.6" fill="none" stroke="url(#vq-ink)" stroke-width="2.1"/>
      <line x1="52.4" y1="15.9" x2="56.4" y2="20.1" stroke="url(#vq-ink)" stroke-width="2.1" stroke-linecap="round"/>
    </svg>
    <span class="word">Velquor</span>
  </div>

  <h1><span class="dim">Your edge is already</span> in your trades.</h1>

  <div>
    <div class="rule"></div>
    <div class="foot">
      <span class="lbl">Auto-sync</span>
      <span class="lbl">AI analysis</span>
      <span class="lbl">Trade copier</span>
      <span class="num" style="margin-left:auto">velquor.app</span>
    </div>
  </div>
</body></html>`

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
const buf = await page.screenshot({ type: 'png' })
writeFileSync(join(root, 'public/og.png'), buf)
console.log(`public/og.png — ${(buf.length / 1024).toFixed(0)} kB`)
await browser.close()
