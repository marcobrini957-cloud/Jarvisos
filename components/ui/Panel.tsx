import { ReactNode } from 'react'
import { Surface } from '@/components/ui/vq'

/**
 * Panel is the legacy box that twelve tabs already compose. It is now literally
 * `Surface` — same corner, same heading size, same padding, no divider under
 * the title — and survives as its own component only for the prop surface
 * (`accent`, `noPadding`, `fill`) its callers rely on.
 *
 * It had *claimed* to render the same thing for a while, and that stopped being
 * true the moment Surface was retuned: the card moved to a 14px corner, a 19px
 * heading and no rule under it, while every Panel on screen stayed at 6px with
 * a 13px title in a bar. Home looked redesigned and Journal, Trading,
 * Discipline and Settings did not, because those tabs are built from this
 * component. Composing Surface instead of restating its styles is what makes
 * that class of drift impossible rather than merely unlikely.
 */
interface PanelProps {
  /** Anchor name for the first-run tour (components/dashboard/tour). */
  'data-tour'?: string
  title?:     ReactNode
  children:   ReactNode
  className?: string
  action?:    ReactNode
  noPadding?: boolean
  /** Left lead rule. Only P&L colours belong here now. */
  accent?:    string
  /** Make the content area flex-fill the panel height (for charts that should
      grow to fill the box). */
  fill?:      boolean
}

export default function Panel({ title, children, className = '', action, noPadding = false, accent, fill = false, 'data-tour': dataTour }: PanelProps) {
  return (
    <Surface
      title={title}
      action={action}
      padded={!noPadding}
      fill={fill}
      className={className}
      data-tour={dataTour}
      style={{
        borderLeft: accent ? `2px solid ${accent}` : undefined,
        // Tables and charts run to the card's edge, so the corner has to clip.
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {children}
    </Surface>
  )
}
