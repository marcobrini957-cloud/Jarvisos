'use client'

import { useEffect, useRef } from 'react'

// Rolling "real-money orders executed" odometer, styled after the TradingView
// broker page. The value is time-derived (base + elapsed × rate) so it's
// deterministic, always increasing, and survives reloads without resetting —
// the units digit rolls continuously (never idle). Tune BASE/RATE, or swap the
// `value()` body to read a real platform figure from an API.
const EPOCH = Date.UTC(2026, 0, 1)   // counter's zero moment
const BASE  = 412_000_000            // orders "already" executed at EPOCH
const RATE  = 11                     // orders per second

const DIGITS   = 9                   // fixed width (leading zeros hidden)
const CELL_H   = 58                  // px per digit cell — matches font size
const CELL_W   = 42

function value(): number {
  return BASE + ((Date.now() - EPOCH) / 1000) * RATE
}

export default function OrdersCounter() {
  const stripRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = value()
      for (let i = 0; i < DIGITS; i++) {
        const strip = stripRefs.current[i]
        if (!strip) continue
        // position from the right: 0 = units (rolls continuously); every
        // higher wheel shows a whole digit and only rolls when it carries
        // (a CSS transition animates that flip) — like a real odometer.
        const place = DIGITS - 1 - i
        const raw = v / Math.pow(10, place)
        const pos = place === 0 ? raw % 10 : Math.floor(raw) % 10
        strip.style.transform = `translateY(${-pos * CELL_H}px)`
        // hide leading zeros: dim the box until this place is "reached"
        const reached = v >= Math.pow(10, place)
        strip.parentElement!.style.opacity = reached ? '1' : '0.12'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '6px' }} aria-hidden>
        {Array.from({ length: DIGITS }).map((_, i) => (
          <div
            key={i}
            style={{
              width: `${CELL_W}px`, height: `${CELL_H}px`, overflow: 'hidden',
              borderRadius: '10px', background: 'var(--s2)',
              border: '1px solid var(--bd2)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
              position: 'relative',
              transition: 'opacity 0.4s',
            }}
          >
            {/* vertical strip 0..9 + wrap-0, translated by the digit's float */}
            <div
              ref={el => { stripRefs.current[i] = el }}
              style={{
                display: 'flex', flexDirection: 'column',
                willChange: 'transform',
                // units wheel (last box) rolls continuously via rAF — no
                // transition; higher wheels animate the carry flip.
                transition: i === DIGITS - 1 ? 'none' : 'transform 0.5s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              {[...Array(10).keys(), 0].map((d, j) => (
                <div
                  key={j}
                  style={{
                    height: `${CELL_H}px`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: `${Math.round(CELL_H * 0.62)}px`, fontWeight: 800,
                    color: 'var(--t1)', letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        fontSize: '13px', color: 'var(--t3)', letterSpacing: '0.06em',
        textTransform: 'uppercase', fontWeight: 600,
      }}>
        Real-money orders executed
      </div>
    </div>
  )
}
