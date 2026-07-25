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

**Still to pick: the mono.** The proof uses SF Mono, which is macOS-only — it
must be self-hosted for production. Options: Berkeley Mono (paid, the most
characterful, best fit for the terminal identity), JetBrains Mono or Martian
Mono (both free, self-hostable). Marco decides.

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
