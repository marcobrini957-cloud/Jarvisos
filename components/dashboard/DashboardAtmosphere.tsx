'use client'

import { Atmosphere } from '@/components/landing/v2/Atmosphere'

/**
 * The landing's weather, behind the product.
 *
 * The landing reads as one designed object rather than a stack of sections
 * mostly because of a single commitment: one continuous lit render behind
 * everything, with every panel a translucent sheet on top of it. The dashboard
 * had none of that — panels at 4% white over flat black, which is the same
 * recipe with nothing underneath, so the translucency did no work and the
 * screen read as boxes on a void.
 *
 * Same shader, three changes for a working surface rather than a hero:
 *
 *  - dimmed. The landing runs it at full value behind marketing copy; a P&L
 *    figure has to stay the brightest thing on screen, so it sits at 62% under
 *    a scrim that is opaque where the dense panels are and nearly clear at the
 *    lit corner.
 *  - anchored bottom-right and oversized, so the bright limb sits under the
 *    corner of the content rather than behind the numbers.
 *  - inert: fixed, aria-hidden, pointer-events none. It never intercepts a
 *    click and it is not in the tab order.
 *
 * It is one canvas for the whole shell, not one per tab — switching sections
 * must not restart the weather.
 */
export function DashboardAtmosphere() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', overflow: 'hidden',
      }}
    >
      {/* Full-bleed, exactly as the landing runs it. The shader composes the
          sphere for the viewport it is given, so scaling or offsetting the
          canvas does not move the sphere — it stretches the limb into a
          diagonal streak across the middle of the trade log. Frame it with the
          scrim instead, never with the canvas box. */}
      <Atmosphere style={{ position: 'absolute', inset: 0, opacity: 0.5, background: 'transparent' }} />

      {/* Scrim. The dense panels live top-left and the reading order runs that
          way, so the black is heaviest there and thins toward the lit corner —
          the render is depth behind the product, never a thing to look at. */}
      <div style={{
        position: 'absolute', inset: 0,
        // #05070A, not #000: the shader's own base is a blue-black, and a pure
        // black scrim over it drains exactly the colour that makes the landing
        // read as lit rather than switched off.
        background: 'linear-gradient(150deg, rgba(5,7,10,0.94) 0%, rgba(5,7,10,0.86) 34%, rgba(5,7,10,0.60) 68%, rgba(5,7,10,0.38) 100%)',
      }} />
    </div>
  )
}
