'use client'

/**
 * VELQUOR 2.0 primitives.
 *
 * The rules these encode, so no screen has to remember them:
 *   · Coolvetica carries words. JetBrains Mono carries every figure. Coolvetica
 *     has no tabular set and one weight, so a number must never touch it.
 *   · Surfaces are white at graded alpha, never solid grey.
 *   · P&L green/red is the only chroma. Nothing else on screen is coloured.
 *   · Small radii, hairline rules, no shadow, no gradient, no glow.
 *
 * See DESIGN.md.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { splitFigures } from '@/lib/ui/figures'

// ── Figures ───────────────────────────────────────────────────────────────────

export type Tone = 'auto' | 'neutral' | 'muted' | 'flat' | 'up' | 'down'

function toneColor(tone: Tone, value?: number): string {
  if (tone === 'up')      return 'var(--color-up)'
  if (tone === 'down')    return 'var(--color-down)'
  if (tone === 'muted')   return 'var(--color-ink-3)'
  // A scratch is its own outcome — neither a gain nor a loss — so it must not
  // borrow the loss colour just because the figure happens to be negative.
  if (tone === 'flat')    return 'var(--color-flat)'
  if (tone === 'neutral') return 'var(--color-ink-1)'
  if (value === undefined || value === 0) return 'var(--color-ink-1)'
  return value > 0 ? 'var(--color-up)' : 'var(--color-down)'
}

/**
 * Every number in the product goes through here — mono, tabular, optically
 * aligned. `value` drives the colour when tone is 'auto'.
 */
export function Num({ children, value, tone = 'neutral', size = 'sm', style }: {
  children: ReactNode
  value?:   number
  tone?:    Tone
  size?:    '2xs' | 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  style?:   CSSProperties
}) {
  return (
    <span
      className="vq-num"
      style={{ fontSize: `var(--text-${size})`, color: toneColor(tone, value), ...style }}
    >
      {children}
    </span>
  )
}

/** Uppercase micro-label. Words, so Coolvetica. */
export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span className="vq-label" style={style}>{children}</span>
}

// ── Surface ───────────────────────────────────────────────────────────────────

export function Surface({ title, action, children, padded = false, fill = false, className = '', style, 'data-tour': dataTour }: {
  title?:   ReactNode
  action?:  ReactNode
  children: ReactNode
  padded?:  boolean
  /** Let the content area grow to the card's height — for charts that fill. */
  fill?:    boolean
  className?: string
  style?:   CSSProperties
  /** Anchor name for the first-run tour (components/dashboard/tour). */
  'data-tour'?: string
}) {
  return (
    <div
      // vq-surface is what lets the stylesheet reach every panel at once — the
      // rise-in on tab entry, and anything else the language wants of a card.
      // It only became possible when Panel stopped drawing its own box.
      className={`vq-surface ${className}`}
      data-tour={dataTour}
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-line-1)',
        // The card is the unit the whole dashboard is built from, so its corner
        // is the one radius that has to be right — the old 10px read as a
        // widget, not a panel. One token, so nothing can drift off it again.
        borderRadius: 'var(--radius-card)',
        display: 'flex', flexDirection: 'column', minWidth: 0,
        ...style,
      }}
    >
      {title && (
        // No divider under the heading. A rule between a title and the thing it
        // titles cuts one object into two, and with ten of these on a screen it
        // was the busiest line in the room. Space separates them instead.
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '10px', padding: '16px 18px 10px',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 1.25vw, 19px)',
            color: 'var(--color-ink-1)', letterSpacing: '-0.025em',
          }}>
            {title}
          </span>
          {action}
        </div>
      )}
      <div style={{
        flex: 1, minWidth: 0,
        padding: padded ? (title ? '0 18px 18px' : '18px') : undefined,
        ...(fill ? { display: 'flex', flexDirection: 'column', minHeight: 0 } : null),
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Metric strip ──────────────────────────────────────────────────────────────

export interface Metric {
  label: string
  value: ReactNode
  meta?: ReactNode
  tone?: Tone
  num?:  number
}

/**
 * The headline figures, one card each.
 *
 * They used to be a single bordered band divided by vertical hairlines — five
 * numbers welded into one object, and the hairlines carried more weight on
 * screen than the figures did. Separate cards on a gap read as five facts, let
 * each one breathe, and match the surface every other panel on the page uses.
 * They wrap on a narrow screen instead of being crushed into five columns.
 */
export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div
      className="vq-metric-strip"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))`,
        gap: '12px',
      }}
    >
      {metrics.map(m => (
        <div
          key={m.label}
          style={{
            padding: '16px 18px', minWidth: 0,
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-line-1)',
            borderRadius: 'var(--radius-card)',
          }}
        >
          <Label>{m.label}</Label>
          <div style={{ marginTop: '9px' }}>
            <Num size="xl" tone={m.tone ?? 'auto'} value={m.num}>{m.value}</Num>
          </div>
          {m.meta && (
            <div style={{
              marginTop: '6px', fontSize: 'var(--text-xs)',
              color: 'var(--color-ink-3)', fontFamily: 'var(--font-display)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {m.meta}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Mixed strings — "17 trades", "+€120/day avg", "61% WR". `Num` assumes the
 * whole string is a figure and `<span>` assumes none of it is; both are wrong
 * here, which is how sub-lines ended up entirely in Coolvetica while the value
 * above them was mono. This gives each run its own voice. See lib/ui/figures.
 */
export function NumText({ children, style }: { children: string; style?: CSSProperties }) {
  return (
    <span style={style}>
      {splitFigures(children).map((run, i) =>
        run.figure
          ? <span key={i} className="vq-num">{run.text}</span>
          : <span key={i}>{run.text}</span>
      )}
    </span>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────

/**
 * A menu we draw ourselves. `<select>` renders the OS control — Aqua chrome, a
 * system chevron, a popup in the platform's font — which is exactly the "looks
 * like every other web app" tell the ban list exists to prevent. Same API shape
 * as the native element so swapping one in is a local edit.
 *
 * Options stay inside the trigger's stacking context, so this is for controls
 * that live in normal flow; the list is capped and scrolls rather than escaping
 * a modal.
 */
export function Select<T extends string>({
  options, value, onChange, width, align = 'left', ariaLabel,
}: {
  options:   { key: T; label: string }[]
  value:     T
  onChange:  (k: T) => void
  width?:    string | number
  align?:    'left' | 'right'
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = options.find(o => o.key === value)?.label ?? ''

  return (
    <div ref={ref} style={{ position: 'relative', width }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '8px', width: '100%',
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
          color: 'var(--color-ink-1)', textAlign: 'left',
          background: 'var(--s2)',
          border: `1px solid ${open ? 'var(--color-line-3)' : 'var(--bd2)'}`,
          borderRadius: 'var(--radius-sm)', padding: '6px 9px', cursor: 'pointer',
          transition: 'border-color 0.12s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current}
        </span>
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
          style={{
            flexShrink: 0, color: 'var(--color-ink-4)',
            transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
          }}>
          <path d="M3 5.5 8 10.5l5-5" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', zIndex: 40,
            left: align === 'left' ? 0 : undefined,
            right: align === 'right' ? 0 : undefined,
            minWidth: '100%', maxHeight: '244px', overflowY: 'auto',
            background: 'var(--s2)', border: '1px solid var(--bd2)',
            borderRadius: 'var(--radius-sm)', padding: '3px',
          }}
        >
          {options.map(o => {
            const on = o.key === value
            return (
              <button
                key={o.key}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => { onChange(o.key); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                  padding: '5px 8px', borderRadius: 'var(--radius-xs)', border: 'none',
                  background: on ? 'var(--color-surface-3)' : 'transparent',
                  color: on ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--color-state-hover)' }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

/**
 * The pressable thing, in four voices.
 *
 * There were a hundred and fifty-nine hand-styled `<button>`s in the dashboard
 * and no two agreed: eight background values, radii from 4 to 999, red text on
 * one tab for the same destructive action that was a grey outline on the next.
 * A screen with four buttons in four shapes reads as four different products.
 *
 *   primary   — the one action a card is for. Ink fill, void text; there is no
 *               brand accent to make it out of.
 *   secondary — everything else with a border around it.
 *   ghost     — repeated row actions, where a border per row would draw a grid.
 *   danger    — destructive. It rests as ink and turns red on hover, so a wall
 *               of Remove links does not paint the screen with the loss colour
 *               (see the colour rule: red is money).
 */
export function Button({
  children, onClick, variant = 'secondary', size = 'md', disabled = false,
  title, type = 'button', full = false, style, className,
}: {
  children: ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  variant?: ButtonVariant
  size?:    ButtonSize
  disabled?: boolean
  title?:   string
  type?:    'button' | 'submit'
  /** Fill the container's width — for a button at the foot of a form. */
  full?:    boolean
  style?:   CSSProperties
  className?: string
}) {
  const [hover, setHover] = useState(false)
  const on = hover && !disabled

  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    fontFamily: 'var(--font-display)',
    fontSize: size === 'sm' ? 'var(--text-sm)' : 'var(--text-base)',
    padding:  size === 'sm' ? '5px 13px' : '8px 18px',
    // A pill, because the landing's every action is one and Segmented already
    // is. An 8px rectangle beside a 999px capsule is two design systems.
    borderRadius: '999px',
    letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    width: full ? '100%' : undefined,
    transition: 'background 0.14s, border-color 0.14s, color 0.14s',
  }

  const skin: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: on ? 'var(--color-ink-2)' : 'var(--color-ink-1)',
      color: 'var(--color-void)', border: '1px solid transparent',
    },
    secondary: {
      background: on ? 'var(--color-surface-2)' : 'transparent',
      color: 'var(--color-ink-1)', border: '1px solid var(--color-line-1)',
    },
    ghost: {
      background: on ? 'var(--color-state-hover)' : 'transparent',
      color: on ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'transparent',
      color: on ? 'var(--color-down)' : 'var(--color-ink-3)',
      border: `1px solid ${on ? 'var(--color-down-dim)' : 'var(--color-line-1)'}`,
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...skin[variant], ...style }}
    >
      {children}
    </button>
  )
}

/** Square, icon-only. Same skins, sized to sit level with a `sm` Button. */
export function IconButton({ children, onClick, title, variant = 'secondary', disabled = false, style }: {
  children: ReactNode
  onClick?: () => void
  title:    string
  variant?: ButtonVariant
  disabled?: boolean
  style?:   CSSProperties
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ padding: 0, width: '28px', height: '28px', flexShrink: 0, ...style }}
    >
      <span aria-hidden style={{ display: 'flex' }}>{children}</span>
      <span className="sr-only">{title}</span>
    </Button>
  )
}

// ── Segmented control ─────────────────────────────────────────────────────────

export function Segmented<T extends string>({ options, value, onChange, titles }: {
  options: { key: T; label: string }[]
  value:   T
  onChange: (k: T) => void
  /** Optional hover text per key — for controls labelled by initial (D/W/M). */
  titles?:  Partial<Record<T, string>>
}) {
  return (
    // Capsule track, and the selected segment is a solid light pill rather than
    // a slightly-lighter grey. The old state was a 4% lift on a 6% surface —
    // technically selected, and unreadable at a glance from across the desk.
    <div style={{
      display: 'flex', gap: '2px', padding: '3px',
      background: 'var(--color-surface-2)', borderRadius: '999px',
    }}>
      {options.map(o => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            title={titles?.[o.key]}
            style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              // A segment that wraps stops being a pill: "P&L %" broke over two
              // lines in the Portfolio header and made the whole track an oval.
              padding: '4px 11px', borderRadius: '999px', border: 'none', whiteSpace: 'nowrap',
              background: on ? 'var(--color-ink-1)' : 'transparent',
              color: on ? 'var(--color-void)' : 'var(--color-ink-3)',
              cursor: 'pointer', transition: 'background 0.14s, color 0.14s',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Rows ──────────────────────────────────────────────────────────────────────

/** key / value line inside a Surface. Hairline separated, no card nesting. */
export function Row({ label, sub, children, last = false }: {
  label:    ReactNode
  sub?:     ReactNode
  children: ReactNode
  last?:    boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px', padding: '9px 14px',
      borderBottom: last ? undefined : '1px solid var(--color-line-1)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
          color: 'var(--color-ink-2)',
        }}>
          {label}
        </div>
        {sub && <div style={{ marginTop: '2px' }}><Label>{sub}</Label></div>}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Run strip ─────────────────────────────────────────────────────────────────

export type RunMark = 'up' | 'down' | 'flat' | 'none'

const RUN_COLOR: Record<RunMark, string> = {
  up:   'var(--color-up)',
  down: 'var(--color-down)',
  flat: 'var(--color-line-3)',
  none: 'var(--color-line-1)',
}

/** Recent outcomes as tick marks — a count tells you "3", this shows what of. */
export function RunStrip({ run, height = 13 }: { run: RunMark[]; height?: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height }}>
      {run.map((m, i) => (
        <span key={i} style={{
          width: '3px', borderRadius: 'var(--radius-xs)', background: RUN_COLOR[m],
          height: m === 'none' ? height * 0.3 : m === 'flat' ? height * 0.45 : height,
        }} />
      ))}
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key:    string
  header: string
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
  width?: string
}

/** Dense data table. Headers are words (Coolvetica); cells should hold <Num>. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty }: {
  columns:  Column<T>[]
  rows:     T[]
  rowKey:   (row: T, i: number) => string
  onRowClick?: (row: T) => void
  empty?:   ReactNode
}) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: '22px 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-3)' }}>
        {empty ?? 'Nothing here yet'}
      </div>
    )
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 400,
                color: 'var(--color-ink-3)', padding: '7px 14px',
                textAlign: c.align ?? 'right', width: c.width,
                borderBottom: '1px solid var(--color-line-1)', whiteSpace: 'nowrap',
              }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={rowKey(r, i)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              style={{ cursor: onRowClick ? 'pointer' : undefined }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-state-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {columns.map(c => (
                <td key={c.key} style={{
                  padding: '6px 14px', textAlign: c.align ?? 'right',
                  borderBottom: i === rows.length - 1 ? undefined : '1px solid var(--color-line-1)',
                  whiteSpace: 'nowrap',
                }}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
