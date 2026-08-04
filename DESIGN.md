# VELQUOR — Design System Spec

Working document for the full redesign. Marco marks this up; nothing gets built
until §1 and §4 are filled in and this doc is approved.

Rule that governs everything here: **never design from memory.** Every screen is
built against a reference or this spec, not against a recollection of what a
trading dashboard looks like.

---

## 0. Why we are doing this

The site currently reads as template-built. That is measurable, not a matter of
taste — as of 2026-07-25 the codebase contains:

| Tell | Count |
|---|---|
| Diagonal `linear-gradient(135deg, …)` used as decoration | 43 |
| Ambient blur blobs (`components/landing/Aurora.tsx`) | 7 |
| Neon glow / text-shadow halos (`card-glow-*`, `glow-pulse-*`) | 16 |
| Gradient-clipped text (`.gradient-gold`, `.gradient-green`) | 9 |
| Centered max-width columns on the landing | 18 |
| Typeface | Inter, via `next/font/google` |

There are components named `Aurora.tsx`, `SectionEyebrow.tsx` (eyebrow →
centred H2 → centred subhead) and `ThreePillars.tsx` (three equal cards). That
trio is the template signature; Inter-from-Google is the fingerprint on top.

---

## 1. North star

> **It should feel premium in a way he has not felt before — not a site that
> makes him think "I have seen this design before."**

That single line is the acceptance test for every screen. It has a sharp
consequence: **recognisability is failure.** Anything a trader can place —
a known template, a known font, a competitor's palette — fails it by
definition, however well executed.

### Reference: FTMO (`Downloads/…FTMO.html`, extracted 2026-07-25)

Take the **architecture**. Reject the **identity**.

**What is worth taking — their surface system is alpha-on-black, not solid greys:**

| Role | FTMO token | Value |
|---|---|---|
| Background | `--color-background-primary` | `#ffffff0a` (white 4%) |
| | `--color-background-secondary` | `#ffffff14` (8%) |
| | `--color-background-tertiary` | `#ffffff1f` (12%) |
| Border | `--color-border-primary` | `#ffffff14` |
| | `--color-border-secondary` | `#ffffff1f` |
| | `--color-border-tertiary` | `#ffffff3d` (24%) |
| Text | content-primary / secondary / tertiary | `#fff` / `#ffffffb8` (72%) / `#ffffff7a` (48%) |
| Interaction | hover / highlighted / pressed | `#ffffff14` → `#ffffff1f` → `#ffffff29` |

Everything is one hue (white) at graded alpha. It composites correctly over any
background, gives a coherent elevation model for free, and is strictly better
than VELQUOR's current hardcoded solid surfaces (`#0C0C0C` / `#131313` /
`#1A1A1A`), which only work on pure black and have no interaction states.

Also worth taking:
- **Semantic naming** (`content-*`, `background-*`, `border-*`, `button-*-hover`)
  rather than literal colour names.
- **Badge pattern**: semantic colour at 15% alpha (`…26`) behind full-strength text.
- **Radii scale**: 4 / 6 / 8 / 12 / 16 / 24 / 32px.
- **4px spacing base** (`--spacing: .25rem`).
- They run **Tailwind v4 CSS-first with `@theme`** — the same stack we chose, so
  this maps directly.

**What must be rejected, and why:**

| FTMO choice | Value | Why we cannot use it |
|---|---|---|
| Primary typeface | **Poppins** (Google) | One of the most-used fonts on the web. Geometric sans, the default of every crypto/fintech template. |
| Body typeface | **Roboto** (Google) | The Android system font. |
| Primary blue | `#0781FE` | Effectively the blue VELQUOR already uses (`#4D8FFF`), and it is *their* uniform — the most recognised prop-firm site among exactly our audience. |
| Semantic set | success `#00C951`, danger `#FB2C36`, warning `#FF6900`, info `#0781FE` | Fine as *structure*; the specific hues are theirs. Ours should be derived from our own accent. |

Adopting their palette **and** their fonts would make VELQUOR read as an FTMO
clone to the one audience most able to spot it. That is the north star failing
in the most literal way possible.

### Still needed

**Anti-references** — sites Marco finds generic, and why. Faster signal than
positives.

| # | Site | What's wrong with it |
|---|---|---|
| 1 | | |
| 2 | | |

---

## 2. Non-negotiables — the ban list

Explicit negative constraints. If a screen violates one of these it does not
ship, regardless of how good it looks in isolation.

### Layout
- **No centred-everything.** No page that is one narrow column down the middle.
- **No 3-up equal card grid** as a default section layout.
- **No eyebrow → centred headline → centred subhead** section opener.
- **No uniform rounded rectangle** wrapping every piece of content. Not
  everything is a card; tables, rails and bare regions are allowed and preferred.

### Colour
- **No purple→blue gradients.** Anywhere.
- **No gradient used as decoration** — background washes, aurora blobs, mesh.
- **No gradient-filled text.**
- **No neon glow, coloured halo or `box-shadow` used as a light source.**
- **Colour must carry meaning.** Green/red are P&L and state. A colour that
  means nothing is not allowed on screen.
- **No rainbow of accents** — panels do not each get their own colour.

### Type
- **Not Inter. Not a Google-font default.** Licensed face, self-hosted (§5).
- **No `text-sm` / `text-base` improvisation** — a defined scale only.
- **Tabular numerals on every figure**, always.

### Iconography
- **No emoji.** Anywhere, ever. `components/ui/Icon.tsx` is the only source.
  (Purged from Overview + mobile nav; still live in mood pickers, habit picker,
  avatar unlocks, onboarding, login, pricing, landing — all in scope.)

### Motion
- **No fade-up-on-scroll on every section.**
- Motion must communicate state change or spatial relationship. Decorative
  animation is banned.

### Controls
- **No native OS controls** in the product surface (`<select>` and friends).

*Marco: add to this list.*

---

## 3. Decisions locked

| Decision | Choice |
|---|---|
| Order | **Dashboard first**, landing after the language is proven |
| Density | **Terminal-dense** — TradingView / Bloomberg, information-first |
| Typeface | **Licensed, self-hosted** (files + license from Marco) |
| Architecture | **Migrate to Tailwind properly**, v4 CSS-first `@theme` tokens |

Density is the decision that shapes every component: the dashboard optimises for
information per screen, not for whitespace. Rows are compact, type is small and
precise, and the eye should be able to scan a column of numbers without
furniture in the way.

---

## 4. Inputs still needed from Marco

1. **Typeface decision** (below) — blocks Stage 0.
2. **Accent colour direction** — see §4.2.
3. Anti-references.
4. **Brand assets**: logo source (vector), wordmark.

### 4.0 Typeface — DECIDED: Coolvetica, as one of two voices

Marco chose **Coolvetica** (Typodermic, installed locally: Regular, Italic,
Condensed, Heavy Compressed). Tested at real dashboard sizes before committing —
specimen in `design/specimen-coolvetica.html`. Two hard findings:

**1. It has no tabular figures.** Rendering a trade table with default figures
and with `font-variant-numeric: tabular-nums` forced produces *identical* output
— the face has no tabular set. Digits are proportional, so `1` is visibly
narrower than `2`: `0.10` and `0.20` are different widths, `+111.11` is far
narrower than `+1000.00`, and decimal points do not line up down a column. For a
screen that is mostly columns of numbers this is a functional defect, not a
taste issue.

**2. It ships one weight.** Requesting 400 / 500 / 600 / 700 renders four
identical lines. Hierarchy cannot come from weight; it must come from size,
colour and case.

**Resolution — the interface speaks in two voices:**

| Voice | Face | Used for |
|---|---|---|
| **Language** | Coolvetica | Wordmark, headings, panel titles, labels, instrument names, prose |
| **Data** | Mono | Every figure, without exception — prices, P&L, percentages, counts, times |

This turns the limitation into the identity. Numbers in a mono makes columns
align perfectly, reinforces "instrument, not app", and no competitor in retail
trading does it. Coolvetica then only carries the words, which is exactly what a
display face is for.

**Coolvetica Heavy Compressed is the wordmark.** It is the most distinctive cut
and is wasted on body copy.

**Mono — DECIDED: JetBrains Mono** (free, OFL, self-hosted). Compared against
SF Mono and Martian Mono at real table density — see `design/mono-comparison.png`.

Reasoning:
- **Coolvetica is already the personality.** A second characterful face competes
  with it. The mono's job is 70% of the screen staying legible and aligned at
  11.5px across hundreds of rows — that is a workhorse brief, not a styling one.
- **Martian Mono is ~15% wider** at the same size, which costs real columns in a
  dense table. JetBrains sits between it and SF Mono.
- **It restores the weight hierarchy Coolvetica lost.** JetBrains Mono ships
  Thin→ExtraBold; since figures carry most of the data, weight-based emphasis
  can live in the mono.
- Free and OFL, so there is no licensing tier to get wrong on a commercial SaaS.

**Berkeley Mono is not ruled out** — it is more characterful and would pair well
with Coolvetica's retro-technical DNA. But `--font-mono` is a single token, so
swapping is a one-line change. Recommendation: live with JetBrains for a week
first, then decide whether the data voice needs more character. If bought, it
must be the **webfont / commercial embedding tier**, not the desktop licence.

### 4.1 Typeface reference — superseded by 4.0

The font is what makes a site unplaceable. Inter says "Next.js template",
Poppins says "startup landing page", Roboto says "Android". None of them can
satisfy the north star no matter how good the layout is.

Constraint from our density choice: it must hold up at **11–13px in dense
tables**, and its **figures must be tabular** — plenty of beautiful display
faces collapse at terminal sizes.

Three directions, cheapest to most premium. Marco verifies pricing/licensing:

| Direction | Text face | Figures | Character |
|---|---|---|---|
| **A — Terminal-native** | ABC Diatype or GT America | **Berkeley Mono** for every number | A real terminal. The mono figures are the identity; nothing in the retail-trading space looks like it. |
| **B — Swiss precision** | Suisse Int'l or Neue Haas Grotesk | Same family's tabular cut | Quiet, expensive, institutional. Reads like a bank rather than a startup. |
| **C — Contemporary** | PP Neue Montreal or Roobert | PP Supply Mono | Distinctive without being loud; more affordable licensing. |

Recommendation: **A**. A characterful mono carrying every figure is the fastest
route to "I have not seen this before" in a product that is 70% numbers, and it
reinforces terminal density rather than fighting it. The text face then only has
to handle labels and prose.

Whatever is chosen: **self-hosted `woff2`, no `next/font/google`.**

### 4.2 Accent colour

FTMO's blue is out (§1). The current `#4D8FFF` is the same blue and equally
generic — it is the default accent of essentially every dark dashboard.

Green and red are **reserved for P&L** and cannot also be the brand colour, or
the interface starts lying about state. So the accent has to sit outside the
P&L axis. Options to react to:

- A warm metal — brass / amber, distinct from every blue competitor.
- A cold near-white / silver, letting P&L green-red be the only colour on screen.
- A single saturated non-blue (deep teal, oxblood) used sparingly as brand.

Recommendation: **near-white accent with P&L as the only chromatic colour.**
Maximum restraint, reads instantly as instrument rather than app, and it is the
option no competitor is taking.

---

## 5. Token architecture

Tailwind v4 is already installed and configured CSS-first — there is no
`tailwind.config.js`; the theme lives in an `@theme` block in
`app/globals.css`. That block becomes the single source of truth.

```
@theme {
  --font-display / --font-text / --font-mono   ← licensed faces
  --text-*        type scale (defined, named, finite)
  --color-*       surfaces, text, semantic (P&L, state)
  --spacing-*     4px grid
  --radius-*      two values, not six
}
```

Rules:
- Every value a component uses must exist as a token. No magic numbers in JSX.
- Semantic names, not literal ones: `--color-profit`, not `--color-green-400`.
- Dark is the product's native mode. Light is out of scope for v1.

---

## 6. Migration plan

Scope, measured 2026-07-25:

| Area | Inline `style={{}}` | Files |
|---|---|---|
| **Dashboard** | **1,296** | 61 |
| Landing | 637 | 24 |
| Everything else | 758 | 46 |
| **Total** | **2,691** | **131** |

This is large but mechanical. It is staged so the app is never half-broken:

- **Stage 0 — tokens.** Write the `@theme` block, install the licensed font,
  delete the old palette. Nothing else changes yet.
- **Stage 1 — primitives.** Rebuild the shared layer in `components/ui/` to the
  new spec (Panel, Stat, Table, Button, Badge, Icon, Menu). Every tab already
  composes these, so this alone moves most of the visual surface.
- **Stage 2 — proof screen.** One full tab rebuilt to the spec, reviewed against
  the references, iterated until Marco signs it off. **Nothing else starts until
  this is approved.**
- **Stage 3 — rollout.** Remaining 11 tabs, in order of how much Marco uses
  them. Each one verified at 1512px and 390px before moving on.
- **Stage 4 — landing, pricing, auth, legal.**
- **Stage 5 — delete.** `Aurora.tsx`, `SectionEyebrow.tsx`, the glow classes,
  the gradient helpers, the remaining emoji.

Mobile is not an afterthought: it is the blueprint for the eventual app, so
every screen is designed at 390px in the same pass as desktop.

---

## 7. Component inventory

Current shared layer (`components/ui/`): Badge, DailyMaxLoss, Icon, InfoTip,
InsightCard, LogoMark, MetricCard, Panel, PeriodMetricCard, ScreenshotGallery,
SessionAnalyticsChart, SessionClock, TradeRow, VoiceDictationButton.

12 dashboard tabs: Overview, Trading, Portfolio, Journal, News, Discipline,
Tasks, Copy, Partners, Analyst, Settings, (+ mobile Overview).

Target primitives — to be agreed at Stage 1:

| Primitive | Replaces |
|---|---|
| `Surface` | ad-hoc `<div style={{background, border, radius}}>` |
| `Stat` | MetricCard / PeriodMetricCard / hero tiles |
| `DataTable` | TradeRow + every hand-rolled table |
| `Button` / `Menu` | inline buttons, the native `<select>` |
| `Chart` shell | each chart's bespoke header/axis furniture |

---

## 8. Verification

- Screenshots at **1512px and 390px** for every screen, taken logged-in against
  real data, compared side by side against the reference.
- The ban list in §2 is checked explicitly before anything is called done.
- Numbers are verified against MetaTrader, per the standing data rule — a
  redesign must not change a single figure.

---

## 9. Proof 01 — Overview (`design/proof-01-overview.html`)

First look at the language, built with Marco's real account data. Open it in a
browser; it uses locally-installed Coolvetica + SF Mono.

What it establishes:
- **Two voices**: Coolvetica for words, mono for every figure. Decimal points
  align down every column.
- **FTMO's alpha-on-black surfaces** (`#ffffff0a/14/1f`), hairline borders,
  6px radii — no solid grey panels.
- **P&L is the only colour on screen.** No brand accent competing with it.
  Chrome, labels and structure are pure white at graded alpha.
- **Terminal density**: 46px header, 38px nav, ~28px table rows, 9.5px labels,
  11.5px data. A metric strip of five figures fits in the height one of the old
  hero cards used.
- **Wordmark** in Coolvetica Heavy Compressed.
- Ban list held: no gradient, no glow, no emoji, no centred column, no 3-up card
  grid, no native controls.

Open questions for Marco on this proof:
1. Is the density right, or push further?
2. Metric strip as one bordered band vs separate tiles?
3. Does the wordmark want more presence?

---

## 10. Build log

**Stage 0 — DONE** (383cf91). Coolvetica + JetBrains Mono self-hosted, subset to
Latin plus trading symbols, 7 faces / 175KB. `@theme` token block added
alongside the legacy palette; nothing applied globally. `/fonts` added to
proxy.ts's public list — it was 307-ing to /login, so signed-out visitors would
have seen the fallback font.

**Stage 1 — DONE** (6bfc1a5). `components/ui/vq`: Surface, MetricStrip, Num,
Label, Segmented, Row, RunStrip, DataTable.

**Stage 2 — DONE, awaiting sign-off** (6bfc1a5). Overview rebuilt at both
breakpoints. Greeting hero replaced by a status line; five figures in one band;
net worth, calendar, streaks, focus and edge facts all on new tokens.

### Open questions for Marco on the proof
1. **Density** — right, or push tighter?
2. **Win rate** now reads all-time (61.0%) rather than this month (85%) because
   the strip has no room for the period switcher. Keep all-time, or restore the
   control?
3. **Metric strip** — one band (as built) vs separate tiles?
4. **Wordmark** — Coolvetica Heavy Compressed is not in the UI yet; it only
   appears in `design/proof-01-overview.html`. It goes in with the chrome.

### Known remaining in the Overview
- Chrome (Topbar, TabBar, MobileNav) still in the old language — shared by all
  12 tabs, belongs to Stage 3.
- `SessionClock` still uses a purple accent — a chroma violation to clean up
  with the chrome.
- Mobile "Daily risk" panel still has a red border treatment from the old system.

**Stage 3 — DONE.** The whole dashboard is on the language: chrome plus the
remaining eleven tabs.

The rollout did not port 2,700 inline styles by hand. The legacy Void Black vars
are **re-pointed inside a `.vq2` scope** on the dashboard shell (see the block at
the end of `app/globals.css`), so every unconverted surface, hairline, ink and
radius resolved to 2.0 values in one step; tabs were then converted structurally
on top of that instead of from scratch. Surfaces are written as their composite
over black (`#0A0A0A`, not white at 4%) so dropdowns, modals and the sticky
chrome stay opaque. Landing, auth and /dev keep the old palette — the class is
only on the dashboard.

Mechanical passes, all scripted:
- **Chroma collapse** (52 files): every hardcoded blue / purple / cyan / gold /
  pink literal → ink at the same alpha; greens and reds → the tuned P&L pair.
- **Radii** → the 3/4/6/8/12 ladder (276 sites, plus Tailwind's `rounded-*`).
- **Type scale**: 591 ad-hoc `fontSize` values onto the named scale.
- **Shadows**: 21 box/text shadows and drop-shadow filters deleted.
- **`font-synthesis: none`** on `.vq2` — Coolvetica ships one weight, so every
  legacy `fontWeight: 600` was being faux-bolded into smeared stems at 12px.
- **Figures → mono**: a JSX walker added `vq-num` to single-element spans whose
  content is plainly a figure (42 sites). CSS cannot see which spans hold digits,
  which is why this rule needed a script rather than a stylesheet.

What the screenshots caught that the code review would not have:
1. `var(--ac)` was used both as an ink colour *and* as a fill. Once the accent
   resolved to white, every toggled control was white-on-white. Fills now take a
   surface step (toggled) or the ink-1/void button (primary).
2. Green-filled action buttons — "+ Add", "Update", "Host in cloud" — read as
   profit. Green means money; actions are ink. Red stays on destructive only.
3. Words were going through the mono voice: "Best mood: Neutral" rendered in
   JetBrains Mono. MetricCard/PeriodMetricCard now check for digits first.
4. Counts were inheriting P&L colour ("17 trades" in green under a green figure).
5. At 390px a "+€1488.70" at 26px ran under its donut — the figure now scales
   with the card, since the ring is the fixed element.

Decisions made during the rollout, all following from "P&L is the only chroma":
- Five mood colours → ordinal brightness (bad keeps red).
- Five habit-category colours → ink.
- Four session colours in SessionClock → open/closed in ink.
- Eight badge tints → direction and outcome only.
- Skill scores (Trader DNA, Radar) → brightness, red for weak. Green is money.
- Partner brand colour lives on the logo tile, not on the card.
- The avatar accent-colour picker was deleted: there is no accent to pick.
- Amber survives only as `--color-warn` for genuine state — a risk gauge past
  50%, a stale bridge heartbeat.

### Stage 3b — the leak sweep (2026-07-28)

Stage 3 put every tab on the language, but a re-audit against §2 found the
places the mechanical passes could not see. Fixed here:

- **Emoji.** The ban list already named the survivors and they were still live:
  the weekly-review mood picker (🚀😊😐😔😤) and its panel titles, the habit
  icon picker (16 emoji, persisted to `habits.icon`), 📂 📷 ⚡ ✦ 💡, and the
  glyphs standing in for icons — ✓ ✕ ✎ ⚠ ↻ ↓ ▼. `Icon.tsx` gained `close`,
  `pencil`, `repeat`, `folder`, `download`. Habits keep their stored value:
  `discipline/habitIcon.ts` maps the legacy emoji to an `IconName` on read, so
  no database migration and nobody loses the mark they picked.
- **Native controls.** Nine `<select>`s were still dropping the OS popup into
  the product — the one thing §2 Controls forbids. New `Select` primitive in
  `components/ui/vq` (drawn trigger, hairline menu, Escape/outside-click,
  `role="listbox"`); every one of the nine now uses it or a `Segmented`.
- **The mono voice, precisely.** `MetricCard`/`PeriodMetricCard` tested the
  *value* for digits but rendered the sub-line wholesale in Coolvetica, so
  "17 trades" and "+€120/day avg" sat in the word font under a mono figure on
  every tab. `NumText` + `lib/ui/figures.ts` split a label into word runs and
  figure runs (`tests/figures.test.ts`). Raw `monospace` / `system-ui` stacks in
  the SVG charts (TraderRadar, EquityCurve, TradingInsights, GroupCard,
  SettingsTab) now use the tokens.
- **Chroma that meant nothing.** Profit-green was carrying an ETF allocation
  slice, a "confident" mood, "Within limits", the profit factor and the win-rate
  bars — none of them money. All → ink, red kept only for a genuinely losing
  edge. Four of the six donut categories had been the same white; the ramp is
  now six steps of brightness. Weekly-review mood and self-grade went from five
  hues to ordinal brightness, F and Terrible keeping red.
- **Ladders.** SVG `fontSize` 8/10/11/15/16/40 → the named scale, `rx="7"` → 6,
  three `7px` labels → `--text-2xs`, mono `fontWeight="800"` → 700 (only 400–700
  faces ship, so 800 was being synthesised).

Verified logged-in at 1512px and 390px across all nine keyboard-reachable tabs
plus the weekly review, the habit modal and the open `Select`; tsc clean, 88
tests, prod build green.

### Stage 3c — the type scale, recalibrated from measurement (2026-07-28)

Marco: "some are legit too small to even read and some are also too big and
take unnecessary space." So the sizes were **measured** rather than judged —
every text node on all twelve tabs, with its computed size, whether it was mono
and whether it held digits.

The audit found fifteen distinct sizes in use, six off the scale entirely, and
the bottom of the ladder carrying most of the product: **1,102 nodes at 9px and
904 at 10.5px, 822 of them containing digits.** Mono figures at 9px are not
readable at arm's length, and the bottom three steps sat ~8% apart — not a
scale, rounding noise.

| | old | new |
|---|---|---|
| 2xs | 9 | **10** |
| xs | 10.5 | **11** |
| sm | 11.5 | **12** |
| base | 12.5 | **13** |
| md | 14 | 14 |
| lg | 17 | 17 |
| xl | 21 | 21 |
| 2xl | 26 | **24** |
| 3xl | 34 | **30** |

Floor up so the dense end is legible; the top two down, because a 34px hero
above a row of 26px metrics spent more height on five numbers than on the data
beneath them. Every rendered size now lands on a step — 8, 8.5, 9, 10.5, 11.5,
12.5, 13, 25, 26 and 34 were all in play before.

`TraderDnaVisual.tsx` was the worst offender and explains itself: it lives in
`components/`, not `components/dashboard/`, so **every earlier sweep missed the
directory**. Its sizes were raw numbers (8, 8.5, 11, 12, 13.5) and none of its
figures carried the mono voice. When auditing, glob `components/**`, not
`components/dashboard/**`.

Caught while verifying: News event rows carried ~480px of fixed grid columns in
a 390px viewport, so the last reading was sliced off the right edge on every
phone. The three readings now drop to their own line.

### Stage 4 — landing, pricing, auth, legal (2026-07-30)

§0 opened this document with the tells that make the site read as template-
built. Every one of them was still live on the marketing pages after the
dashboard had moved; the rebuild is measured the same way it was diagnosed.

| Tell (§0 / §2) | Before | After |
|---|---|---|
| Inter, via `next/font/google` | served to every visitor | **0 elements** |
| Gradient-clipped text | headline, stats band, final CTA | **0** |
| Decorative gradients ≥40×40px | 26 in source | **1**, inside the product mock |
| Coloured glow shadows | 16 | **2**, inside the product mock |
| Emoji | 10 files | **0** |
| `SectionEyebrow` opener | 13 uses | component deleted |
| Horizontal overflow at 390px | — | **0px on every page** |
| Rendered sizes off the scale | 15 distinct | **0** (excluding the mocks) |

Measured in the browser at 1512px and 390px across `/`, `/pricing`, `/login`,
`/terms` and `/impressum`, walking each page to the bottom so the scroll-
revealed sections mount. The two exceptions are both inside `AnimatedDashboard`
and `LoginDashboardPreview` — pixel replicas of the *pre-redesign* dashboard,
built from screenshots taken 2026-07-17. Their chrome is de-coloured and their
emoji are gone, but a true 1:1 refresh against the current dashboard is its own
job and is listed below.

**The bridge moved.** Landing, pricing, auth, gate, onboarding and the legal
pages carry `vq2` on their roots, so `--bg`, `--ac`, `--go` resolve to 2.0
values everywhere. /dev keeps Void Black on purpose: it is the admin console.

**Two bugs the bridge exposed.** Inside `.vq2` the accent *is* white, and six
buttons were `background: var(--ac)` with `color: 'white'` — Sign in, Create
account, Send reset link, and three in onboarding were all white-on-white. A
focused input drew a full-white border for the same reason.

**Display type.** The dashboard scale stops at 3xl because a terminal has
nothing to say at 88px; a landing headline does. Marketing type is fluid
*between two named steps* — `clamp(var(--text-3xl), 3.6vw, var(--text-d2))` —
never between two numbers. The steps are `--text-d1..d4` = 38 / 48 / 64 / 88.

⚠️ **They live in `:root`, not `@theme`.** Tailwind v4 emits only the theme
variables some generated utility references, and every use here is an inline
style the compiler cannot see. Declared in `@theme` they resolved to *nothing*
and a 38px headline fell back to 13px inherited. Worse, `--text-4xl` through
`--text-7xl` are Tailwind's own keys, so the first attempt silently rendered
Tailwind's 36px instead of our 38px. Own the namespace; verify in the browser.

**Follow-up.** `AnimatedDashboard.tsx` (1,095 lines) and
`LoginDashboardPreview.tsx` still replicate the July-17 dashboard. Rebuilding
them 1:1 against the current one is the last piece of the marketing site — and
per the house rule, it is done from screenshots, never from memory.

**Stage 5.** Delete the legacy palette and the `.vq2` bridge once nothing reads
the old vars; drop the glow/gradient helper classes.

### Stage 6 — the interior, on the language it already had (2026-08-04)

The landing was rebuilt on 2026-08-03 and the dashboard chrome followed it the
same afternoon: navigation into a left column, the header down to breadcrumb +
section title, `Surface` retuned to a 14px corner with a 19px heading and no
rule under it, `Segmented` to a capsule with a solid light pill. That commit
said all ten tabs inherited it.

**They did not, and the reason is worth writing down.** Five files use
`Surface`. Twelve tabs are built from `Panel`, which *restated* Surface's styles
by hand and had been in sync until the moment Surface changed. So Home looked
redesigned while Journal, Trading, Discipline, Portfolio and Settings kept the
6px corner, the 13px title and the divider — and the interior read as
half-finished for a day.

Panel is now literally `Surface`, keeping only the props its callers need
(`accent`, `noPadding`, `fill`). **A primitive that describes another primitive
in prose will drift; one that composes it cannot.**

| | Before | After |
|---|---|---|
| Card corners in play | 6px (Panel ×12 tabs), 14px (Surface ×5), 12px (copy group) | one, `--radius-card` |
| Button shapes | 159 hand-styled, 8 background values, radii 4–999 | `Button` / `IconButton`, 4 variants |
| Selected-state controls | Segmented capsule *and* four sets of drawn pills | Segmented |
| Red on non-money | overdue ×5, `high`/`risk`/`screenshot` badges, Watch Out, 4 destructive controls | 0 |
| Sections announcing their own name | Settings, Copy | 0 |

**The corner is a token.** It was a literal `14` inside two primitives while
thirteen hand-drawn cards sat at `--radius-md`. Panels carry `--radius-card`;
boxes nested *inside* a card stay on the small steps, or a 14px corner ends up
inside a 14px corner.

**Danger rests as ink.** A copy group with three followers drew five red
controls before anyone touched anything. `danger` is ink at rest and red on
hover, which keeps the loss colour for losses.

**Amber is not a smaller red.** Overdue was red in Tasks and amber in
Discipline — the same fact, two colours, decided twice. Worse, `Badge` mapped
`screenshot` to the loss hue, so "there is a picture attached" rendered in the
colour that means "this trade lost money".

**What the mobile tree taught.** Making the metric strip wrap fixed the desktop
and broke the phone: two strips of three, under 640px, each put two cards on a
row and left the third alone. A layout that was correct for a *band* is not
automatically correct for *cards that wrap*. One strip of six fills 2×3.

Measured after, at 1440px and 390px across all eleven sections: no horizontal
overflow anywhere, no page errors, 233 tests green.

### Stage 7 — the landing's language, inside the product (2026-08-04)

Marco's verdict on Stage 6: "I barely see any changes." Correct, and the
diagnosis matters more than the fix. Stage 6 made the interior *consistent* —
one card, one button, one colour for a warning. It did not make it *feel* like
anything, because the thing that makes the landing feel expensive was never in
the product at all.

**What the landing actually has that the dashboard did not.** Not the type, not
the palette — one continuous lit render behind everything, with every panel a
translucent sheet over it. The dashboard had the second half of that recipe and
none of the first: panels at 4% white over flat black, so the translucency did
no work and the screen read as boxes on a void.

| | Landing | Dashboard, before | Dashboard, now |
|---|---|---|---|
| Background | shader, full-bleed | `#000` | same shader at 50%, scrim-framed |
| Panel | white 4.5%, blur 26 | white 4%, no blur | white 4%, over the render |
| Chrome | translucent + blur | solid black | translucent + blur |
| Radii | 8 / 12 / 999 | 6 / 8 / 12 / 14 / 999 | 8 / 12 / 999 |
| Entrance | 18px rise, 900ms | 220ms fade | 14px rise, 620ms, staggered |
| Gap between boxes | one | 8 / 10 / 12 / 16 | 12 |

⚠️ **Frame the render with the scrim, never with the canvas box.** The shader
composes its sphere for whatever viewport it is handed, so offsetting or
oversizing the canvas does not move the sphere — it stretches the limb into a
diagonal streak across the middle of the trade log. Full-bleed, then shape it
with a gradient over the top.

⚠️ **The scrim is `#05070A`, not `#000`.** Pure black over the shader drains
exactly the blue that makes the landing read as lit rather than switched off.

**Charts were the loudest inconsistency, and Marco named them before the pass
did.** Four ring implementations, three visible at once on Trading: a 48px
green/red conic donut, a 56px blue one with a ring twice as thick, two more 48px
dials — and the Portfolio allocation ring drawn as annular sectors with a
gradient per segment, a specular sweep and a drop shadow, the one object on the
dashboard lit from its own direction. One `Ring` now, geometry as ratios of the
diameter (width 11.5%, 2° gaps cut from the geometry, transparent hole) so a
52px dial and a 168px allocation ring are the same object at two sizes.

**A consistent wrong answer is still wrong.** Once the dials matched, three
saturated `--color-key` rings sat in one row out-shouting the figures they
annotate. The arcs are ink; money keeps green and red. Making things identical
can *raise* a problem that inconsistency was hiding.

**What the dials taught about holes.** Every old ring punched a solid black disc
in its centre. Over an opaque card nobody noticed; over a translucent panel on a
lit background it is a hole in the screen. Anything that fakes the background
colour breaks the moment the background stops being a colour.
