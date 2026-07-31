interface LogoMarkProps {
  size?: number
  /** Draw the mark on its black tile. False gives the bare V on whatever is behind it. */
  showBackground?: boolean
  className?: string
}

/**
 * The VELQUOR mark.
 *
 * Replaced the hand-drawn SVG monogram (a calligraphic V with an orbital Q) in
 * July 2026. The new mark is a sculpted V carrying real light, which is not
 * something flat vector paths reproduce — so it ships as raster, generated from
 * one 1254px master into the sizes actually used.
 *
 * Two assets, because a logo has to work on two kinds of surface:
 *  · `vq-logo-*.png` — the mark on its black tile. Its own lockup.
 *  · `vq-mark-*.png` — alpha cut from the master's luminance, so it keeps the
 *                      shading and sits on any colour without dragging a black
 *                      square onto it. This is what emails and light surfaces
 *                      need.
 *
 * A plain <img> rather than next/image on purpose: this renders at 20–72px in
 * flex rows all over the app, and the wrapper next/image introduces would have
 * to be fought in every one of them to save no bytes on an asset this small.
 */
export function LogoMark({ size = 32, showBackground = true, className }: LogoMarkProps) {
  // Serve the next size up from the master set so it stays sharp on 2× screens.
  const asset = showBackground ? 'vq-logo' : 'vq-mark'
  const step  = size <= 32 ? 64 : size <= 96 ? 192 : 512

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/${asset}-${step}.png`}
      width={size}
      height={size}
      alt="VELQUOR"
      className={className}
      style={{
        flexShrink: 0,
        display: 'block',
        width: `${size}px`,
        height: `${size}px`,
        // The tile is a square bitmap; the corner rounding is ours, scaled with
        // the mark so it reads the same at 26px and at 72px.
        borderRadius: showBackground ? `${Math.round(size * 0.22)}px` : undefined,
      }}
    />
  )
}
