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

## 1. North star — **TBD (Marco)**

> One sentence. A trader lands for three seconds — what should they feel?

*(to fill in)*

**Reference sites** — 3–5, each with the axis it is being referenced for
(layout / type / density / colour / motion), so competing references don't get
averaged into mush:

| # | Site | Referenced for | Notes |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Anti-references** — sites that look generic, and why:

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

1. §1 north star + reference table + anti-references (screenshots).
2. **Font files + license** for the chosen typeface. Ideally a display cut and a
   text cut, plus a mono for figures if the family has one.
3. **Design tokens**, if extractable from a reference: colour ramps, type scale,
   spacing, radii.
4. **Brand assets**: logo source (vector), wordmark, any existing brand guide.
5. Any competitor VELQUOR must explicitly *not* resemble.

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
