'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/LogoMark'
import { useLocale } from '@/hooks/useLocale'

const VelquorTrailerEmbed = dynamic(
  () => import('@/components/trailer/VelquorTrailer'),
  { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: '#000' }} /> }
)

// ── Aurora data-stream bars ───────────────────────────────────────────────────
function Aurora() {
  const bars = Array.from({ length: 52 }, (_, i) => {
    const colors = ['#FF2D9A', '#E040FB', '#7B61FF', '#4BC0FF', '#FF6B9D', '#A78BFA']
    return {
      left: `${(i / 52) * 100}%`,
      height: `${32 + Math.abs(Math.sin(i * 1.71)) * 72}px`,
      width: `${i % 3 === 0 ? 2.5 : i % 3 === 1 ? 1.5 : 1}px`,
      color: colors[i % colors.length],
      delay: `${((i * 0.09) % 2.8).toFixed(2)}s`,
      duration: `${(1.6 + (i * 0.17) % 1.8).toFixed(2)}s`,
      anim: i % 2 === 0 ? 'aurora-a' : 'aurora-b',
    }
  })

  return (
    <>
      <style>{`
        @keyframes aurora-a { 0%,100%{opacity:.65;transform:scaleY(1)} 50%{opacity:.06;transform:scaleY(.45)} }
        @keyframes aurora-b { 0%,100%{opacity:.35;transform:scaleY(.75)} 50%{opacity:.08;transform:scaleY(.35)} }
      `}</style>
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '110px', zIndex: 1, pointerEvents: 'none', overflow: 'hidden',
      }}>
        {bars.map((b, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0,
            left: b.left, width: b.width, height: b.height,
            background: `linear-gradient(180deg,${b.color} 0%,transparent 100%)`,
            animation: `${b.anim} ${b.duration} ease-in-out ${b.delay} infinite`,
            borderRadius: '0 0 2px 2px',
          }} />
        ))}
      </div>
    </>
  )
}

// ── Intro splash ──────────────────────────────────────────────────────────────
function IntroSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'zoom'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('zoom'), 1400)
    const t3 = setTimeout(() => onDone(),         2000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <>
      <style>{`
        @keyframes splash-in {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-zoom {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(14); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.12); }
        }
        @keyframes tagline-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: '#000',
        opacity: phase === 'zoom' ? 0 : 1,
        transition: phase === 'zoom' ? 'opacity 0.55s ease 0.1s' : 'none',
        pointerEvents: phase === 'zoom' ? 'none' : 'all',
      }} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        pointerEvents: 'none',
        animation: phase === 'zoom' ? 'splash-zoom 0.6s cubic-bezier(0.55,0,1,0.45) forwards' : 'none',
      }}>
        {phase === 'hold' && (
          <div style={{
            position: 'absolute',
            width: '320px', height: '320px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,152,10,0.22) 0%, transparent 68%)',
            animation: 'glow-pulse 1.2s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px',
          animation: phase === 'in' ? 'splash-in 0.6s cubic-bezier(0.34,1.4,0.64,1) forwards' : 'none',
        }}>
          <div style={{
            boxShadow: phase === 'hold'
              ? '0 0 0 1px rgba(201,168,76,0.2), 0 12px 60px rgba(201,168,76,0.4), 0 0 120px rgba(201,168,76,0.15)'
              : '0 8px 40px rgba(201,168,76,0.25)',
            borderRadius: '17.28px',
            transition: 'box-shadow 0.5s ease',
          }}>
            <LogoMark size={96} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#F2F2F2', fontWeight: 800, fontSize: '32px', letterSpacing: '-0.04em', lineHeight: 1 }}>
              Velquor
            </div>
            <div style={{
              color: '#505050', fontSize: '11px', marginTop: '10px',
              letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500,
              opacity: phase === 'hold' ? 1 : 0,
              animation: phase === 'hold' ? 'tagline-in 0.4s ease forwards' : 'none',
            }}>
              Your Trading Operating System
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ target, prefix = '', suffix = '', decimals = 0 }: {
  target: number; prefix?: string; suffix?: string; decimals?: number
}) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      let start = 0
      const step = target / 60
      const t = setInterval(() => {
        start = Math.min(start + step, target)
        setVal(start)
        if (start >= target) clearInterval(t)
      }, 16)
    })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{prefix}{val.toFixed(decimals)}{suffix}</span>
}

// ── Animated product demo ─────────────────────────────────────────────────────
const VELQUOR_TEXT = "Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. You're trading against institutional order flow before direction is established. Consider a 30-minute wait rule. Your London-only NAS100 trades hit 71% win rate."

const CURSOR_SVG_PATH = "M1 1 L1 13.5 L4.2 10.2 L6.5 16.5 L8.8 15.5 L6.5 9.2 L11.5 9.2 Z"

function AnimatedDashboard() {
  const TAB_NAMES    = ['Overview', 'Trading', 'Journal', 'Macro', 'VELQUOR']
  const TAB_ORDER    = [0, 1, 2, 4]
  const NEXT_TAB_IDX = [1, 2, 4, 0]

  const DRIFT_EASE = 520   // ms per drift transition
  const DRIFT_INTV = 470   // ms between drift starts — less than DRIFT_EASE so next fires before current arrives

  // Cursor never stops: 5 waypoints per tab the cursor drifts through naturally
  const DRIFT_PATHS = [
    [[0.64,0.28],[0.76,0.34],[0.55,0.42],[0.38,0.37],[0.60,0.45]], // Overview: metrics → chart → trades
    [[0.60,0.42],[0.70,0.54],[0.48,0.62],[0.36,0.44],[0.64,0.58]], // Trading: chart → table
    [[0.26,0.40],[0.18,0.48],[0.32,0.44],[0.70,0.54],[0.52,0.62]], // Journal: calendar → entry
    [[0.58,0.50],[0.34,0.46],[0.66,0.64],[0.46,0.62],[0.56,0.72]], // VELQUOR: chips → chat
  ] as const

  const CONTENT_FRAC = [
    [0.60,0.34],[0.57,0.50],[0.30,0.46],[0.54,0.67],
  ] as const

  const INTER_FRAC = [
    [0.50,0.18],[0.55,0.20],[0.44,0.17],[0.40,0.28],
  ] as const

  const [step,           setStep]          = useState(0)
  const [visible,        setVisible]       = useState(true)
  const [progress,       setProgress]      = useState(0)
  const [velquorChars,   setVELQUORChars]  = useState(0)
  const [cursorX,        setCursorX]       = useState(0)
  const [cursorY,        setCursorY]       = useState(0)
  const [cursorEase,     setCursorEase]    = useState(DRIFT_EASE)
  const [cursorCubic,    setCursorCubic]   = useState('0.45,0,0.55,1')
  const [cursorClicking, setCursorClicking] = useState(false)

  const activeTab    = TAB_ORDER[step]
  const containerRef = useRef<HTMLDivElement>(null)
  const tabPtsRef    = useRef<Array<{x:number,y:number}>>([])
  const cursorPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return
      const box  = containerRef.current.getBoundingClientRect()
      const tabs = containerRef.current.querySelectorAll<HTMLElement>('[data-tab]')
      tabPtsRef.current = Array.from(tabs).map(el => {
        const r = el.getBoundingClientRect()
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
      })
      if (cursorPosRef.current.x === 0 && box.width > 0) {
        const ix = box.width * 0.60, iy = box.height * 0.34
        setCursorX(ix); setCursorY(iy)
        cursorPosRef.current = { x: ix, y: iy }
      }
    }
    const t = setTimeout(measure, 80)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const ids: ReturnType<typeof setTimeout>[] = []

    // Move cursor to a fractional position with given easing
    const go = (fx: number, fy: number, ease: number, cubic: string) => {
      if (!containerRef.current) return
      const { width: W, height: H } = containerRef.current.getBoundingClientRect()
      if (!W) return
      const tx = W * fx, ty = H * fy
      setCursorEase(ease); setCursorCubic(cubic)
      setCursorX(tx); setCursorY(ty)
      cursorPosRef.current = { x: tx, y: ty }
    }

    // 5 drifts — each starts before previous finishes, so cursor is always mid-motion
    const drifts = DRIFT_PATHS[step]
    drifts.forEach(([fx, fy], i) => {
      ids.push(setTimeout(() => go(fx, fy, DRIFT_EASE, '0.45,0,0.55,1'), i * DRIFT_INTV))
    })

    // Progress bar (fills over ~2900ms, snaps to 100% on switch)
    let prog = 0
    const progId = setInterval(() => {
      prog = Math.min(prog + 100 / (2900 / 40), 100)
      setProgress(prog)
    }, 40)

    // Move toward nav
    ids.push(setTimeout(() => {
      const [ix, iy] = INTER_FRAC[step]
      go(ix, iy, 260, '0.4,0,0.2,1')
    }, 2150))

    // Snap to tab
    ids.push(setTimeout(() => {
      const tab = tabPtsRef.current[NEXT_TAB_IDX[step]]
      if (tab && containerRef.current) {
        setCursorEase(110); setCursorCubic('0.16,1,0.3,1')
        setCursorX(tab.x); setCursorY(tab.y)
        cursorPosRef.current = { x: tab.x, y: tab.y }
      }
    }, 2440))

    // Click ripple
    ids.push(setTimeout(() => setCursorClicking(true),  2540))
    ids.push(setTimeout(() => setCursorClicking(false), 2760))

    // Move toward next tab content
    ids.push(setTimeout(() => {
      const nextStep = (step + 1) % 4
      const [nfx, nfy] = CONTENT_FRAC[nextStep]
      go(nfx, nfy, 480, '0.25,0.46,0.45,0.94')

      clearInterval(progId)
      setProgress(100)
      setVisible(false)
      setVELQUORChars(0)

      setTimeout(() => {
        setStep(s => (s + 1) % 4)
        setProgress(0)
        setVisible(true)
      }, 260)
    }, 2640))

    return () => {
      ids.forEach(clearTimeout)
      clearInterval(progId)
    }
  }, [step])

  useEffect(() => {
    if (step !== 3 || !visible) return
    let i = 0
    const id = setInterval(() => {
      i++
      setVELQUORChars(i)
      if (i >= VELQUOR_TEXT.length) clearInterval(id)
    }, 18)
    return () => clearInterval(id)
  }, [step, visible])

  const pts = [28, 44, 36, 58, 50, 73, 63, 86, 76, 93, 83, 100]
  const CW = 500, CH = 60
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * CW)
  const ys = pts.map(p => CH - (p / 100) * CH * 0.88 - CH * 0.06)
  const lp  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const ap  = `${lp} L${CW},${CH} L0,${CH} Z`

  const trades = [
    { sym: 'XAUUSD', type: 'BUY',  pnl: +284.50, setup: 'Order Block', session: 'London' },
    { sym: 'NAS100', type: 'SELL', pnl: -112.20, setup: 'BOS/CHoCH',   session: 'NY open' },
    { sym: 'XAUUSD', type: 'BUY',  pnl: +196.00, setup: 'FVG',         session: 'London' },
    { sym: 'EURUSD', type: 'BUY',  pnl:  +44.80, setup: 'S/R Flip',    session: 'NY' },
  ]

  const calWins   = [3, 5, 9, 12, 16, 17, 19, 21]
  const calLosses = [4, 10, 14, 18]

  return (
    <>
      <style>{`
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes cursor-click { 0%{transform:scale(0.2);opacity:1} 100%{transform:scale(2.6);opacity:0} }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', background: '#090D13', position: 'relative' }}>

        {/* Cursor — plain, upright, no rotation or stretch */}
        <div style={{
          position: 'absolute',
          left: cursorX,
          top: cursorY,
          zIndex: 60,
          pointerEvents: 'none',
          filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
          transition: [
            `left ${cursorEase}ms cubic-bezier(${cursorCubic})`,
            `top ${cursorEase}ms cubic-bezier(${cursorCubic})`,
          ].join(', '),
        }}>
          <svg width="13" height="17" viewBox="0 0 13 17" fill="none">
            <path d={CURSOR_SVG_PATH} fill="white" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
          </svg>
          {cursorClicking && (
            <div style={{
              position: 'absolute', top: '-5px', left: '-5px',
              width: '23px', height: '23px', borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.9)',
              animation: 'cursor-click 0.36s ease-out forwards',
            }} />
          )}
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.015)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <LogoMark size={18} />
            <span style={{ color: 'var(--t1)', fontSize: '11px', fontWeight: 700 }}>Velquor</span>
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {TAB_NAMES.map((name, i) => (
              <span key={name} data-tab={i} style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '6px',
                color: i === activeTab ? 'var(--ac)' : 'var(--t3)',
                background: i === activeTab ? 'rgba(77,143,255,0.12)' : 'transparent',
                fontWeight: i === activeTab ? 600 : 400,
                transition: 'all 0.25s ease',
                borderBottom: i === activeTab ? '1px solid rgba(77,143,255,0.4)' : '1px solid transparent',
              }}>{name}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'var(--t2)' }}>€</div>
            <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: 'linear-gradient(145deg,var(--ac),var(--pu))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white' }}>M</div>
          </div>
        </div>

        {/* Content — fades between tabs */}
        <div style={{
          padding: '16px 18px 14px', minHeight: '280px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.28s ease, transform 0.28s ease',
        }}>

          {/* ── OVERVIEW ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--t3)', fontSize: '11px' }}>Good morning, Marco</p>
                <p style={{ margin: '2px 0 0', color: 'var(--t1)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em' }}>Your edge is working today.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                {[
                  { label: 'Today P&L',   value: '+€408.70', color: 'var(--gr2)' },
                  { label: 'Win Rate',    value: '80%',       color: 'var(--ac)'  },
                  { label: 'Balance',     value: '€12,408',   color: 'var(--t1)'  },
                  { label: 'Open Trades', value: '2',         color: 'var(--am2)' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '9px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</p>
                    <p style={{ margin: '3px 0 0', color: m.color, fontSize: '13px', fontWeight: 700 }}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ margin: '0 0 8px', color: 'var(--t2)', fontSize: '10px', fontWeight: 600 }}>Weekly P&L</p>
                  <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '44px', overflow: 'visible' }}>
                    <defs><linearGradient id="g-ov" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--ac)" stopOpacity="0.25"/><stop offset="100%" stopColor="var(--ac)" stopOpacity="0"/></linearGradient></defs>
                    <path d={ap} fill="url(#g-ov)"/>
                    <path d={lp} fill="none" stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill="var(--ac)"/>
                  </svg>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <p style={{ margin: 0, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t2)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Trades</p>
                  {trades.slice(0,3).map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '7px', padding: '1px 4px', borderRadius: '3px', fontWeight: 700, background: t.type==='BUY'?'rgba(0,255,133,0.1)':'rgba(255,51,71,0.1)', color: t.type==='BUY'?'var(--gr2)':'var(--re)' }}>{t.type}</span>
                        <span style={{ color: 'var(--t1)', fontSize: '10px', fontWeight: 500 }}>{t.sym}</span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: t.pnl>=0?'var(--gr2)':'var(--re)' }}>{t.pnl>=0?'+':''}€{Math.abs(t.pnl).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TRADING ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
                {[
                  { label: 'Total P&L',    value: '+€1,824', color: 'var(--gr2)' },
                  { label: 'Win Rate',     value: '67%',     color: 'var(--ac)'  },
                  { label: 'Profit Factor',value: '2.14',    color: 'var(--am2)' },
                  { label: 'Avg Win',      value: '+€240',   color: 'var(--gr)'  },
                  { label: 'Avg Loss',     value: '−€100',   color: 'var(--re)'  },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '9px 8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</p>
                    <p style={{ margin: '3px 0 0', color: m.color, fontSize: '12px', fontWeight: 700 }}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--t2)', fontSize: '10px', fontWeight: 600 }}>Equity Curve — This Month</p>
                  <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '10px', fontWeight: 600 }}>+€1,824</p>
                </div>
                <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '52px', overflow: 'visible' }}>
                  <defs><linearGradient id="g-tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--gr2)" stopOpacity="0.2"/><stop offset="100%" stopColor="var(--gr2)" stopOpacity="0"/></linearGradient></defs>
                  <path d={ap} fill="url(#g-tr)"/>
                  <path d={lp} fill="none" stroke="var(--gr2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill="var(--gr2)"/>
                </svg>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 46px 80px 1fr 64px', padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t3)', fontSize: '7px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  <span>Pair</span><span>Side</span><span>Setup</span><span>Session</span><span style={{ textAlign: 'right' }}>P&L</span>
                </div>
                {trades.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 46px 80px 1fr 64px', padding: '6px 12px', borderBottom: i < trades.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center', background: i===0?'rgba(77,143,255,0.04)':'transparent' }}>
                    <span style={{ color: 'var(--t1)', fontSize: '10px', fontWeight: 600 }}>{t.sym}</span>
                    <span style={{ fontSize: '7px', padding: '2px 4px', borderRadius: '3px', fontWeight: 700, width: 'fit-content', background: t.type==='BUY'?'rgba(0,255,133,0.1)':'rgba(255,51,71,0.1)', color: t.type==='BUY'?'var(--gr2)':'var(--re)' }}>{t.type}</span>
                    <span style={{ color: 'var(--t2)', fontSize: '9px' }}>{t.setup}</span>
                    <span style={{ color: 'var(--t3)', fontSize: '9px' }}>{t.session}</span>
                    <span style={{ textAlign: 'right', fontSize: '10px', fontWeight: 700, color: t.pnl>=0?'var(--gr2)':'var(--re)' }}>{t.pnl>=0?'+':''}€{Math.abs(t.pnl).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── JOURNAL ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ margin: '0 0 10px', color: 'var(--t2)', fontSize: '10px', fontWeight: 600 }}>June 2026</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
                    {['M','T','W','T','F','S','S'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontSize: '7px', color: 'var(--t3)', fontWeight: 600 }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                    {[null,null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map((d, i) => (
                      <div key={i} style={{
                        textAlign: 'center', fontSize: '8px', padding: '2px 1px', borderRadius: '3px',
                        color: d===21?'white':d?'var(--t2)':'transparent',
                        background: d===21?'var(--ac)':d&&calWins.includes(d)?'rgba(0,255,133,0.18)':d&&calLosses.includes(d)?'rgba(255,51,71,0.15)':'transparent',
                        fontWeight: d===21?700:400,
                      }}>{d||''}</div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ margin: 0, color: 'var(--t1)', fontSize: '11px', fontWeight: 600 }}>Today&apos;s Entry</p>
                    <span style={{ background: 'rgba(0,255,133,0.1)', color: 'var(--gr2)', fontSize: '8px', padding: '2px 7px', borderRadius: '20px', fontWeight: 600 }}>WIN DAY</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {['London', 'ICT setup', 'Confident'].map(tag => (
                      <span key={tag} style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t2)', fontSize: '8px', padding: '2px 6px', borderRadius: '20px' }}>{tag}</span>
                    ))}
                  </div>
                  <p style={{ margin: '0 0 10px', color: 'var(--t2)', fontSize: '10px', lineHeight: 1.7 }}>
                    Took 2 XAUUSD trades during London open. Both hit target. Waited for the OB before entering. Felt calm and patient.
                  </p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--t3)', fontSize: '8px' }}>Mood</span>
                    <span style={{ background: 'rgba(0,255,133,0.12)', color: 'var(--gr2)', fontSize: '9px', padding: '2px 8px', borderRadius: '20px' }}>😌 Confident</span>
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '28px', alignItems: 'center' }}>
                {[
                  { label: 'Journal Streak',   value: '12 days', icon: '🔥' },
                  { label: 'Discipline Score', value: '87 / 100', icon: '✅' },
                  { label: 'Best Streak',      value: '19 days', icon: '🏆' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{s.icon}</span>
                    <div>
                      <p style={{ margin: 0, color: 'var(--t3)', fontSize: '9px' }}>{s.label}</p>
                      <p style={{ margin: 0, color: 'var(--t1)', fontSize: '12px', fontWeight: 700 }}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VELQUOR ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LogoMark size={28} />
                <div>
                  <p style={{ margin: 0, color: 'var(--t1)', fontSize: '12px', fontWeight: 700 }}>VELQUOR AI</p>
                  <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '10px' }}>● Online · analysing your 247 trades</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Why am I losing on Nasdaq?', "What's my best setup?", 'Am I overtrading?'].map((q, i) => (
                  <span key={q} style={{
                    background: i===0?'rgba(77,143,255,0.12)':'rgba(255,255,255,0.04)',
                    border: i===0?'1px solid rgba(77,143,255,0.3)':'1px solid rgba(255,255,255,0.07)',
                    color: i===0?'var(--ac)':'var(--t3)',
                    fontSize: '10px', padding: '4px 10px', borderRadius: '20px',
                  }}>{q}</span>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'var(--ac)', color: 'white', padding: '8px 12px', borderRadius: '10px 10px 2px 10px', fontSize: '12px' }}>
                    Why am I losing on Nasdaq?
                  </div>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <LogoMark size={24} />
                  <p style={{ margin: 0, color: 'var(--t2)', fontSize: '11px', lineHeight: 1.75 }}>
                    {VELQUOR_TEXT.slice(0, velquorChars)}
                    {velquorChars < VELQUOR_TEXT.length && (
                      <span style={{ display: 'inline-block', width: '2px', height: '12px', background: 'var(--ac)', marginLeft: '1px', animation: 'cursor-blink 0.7s step-end infinite', verticalAlign: 'text-bottom' }} />
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar — shows time until next tab */}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${progress}%`, background: 'linear-gradient(90deg,var(--go2),var(--ac))', transition: 'width 0.04s linear' }} />
        </div>
      </div>
    </>
  )
}

// ── Static mockup (used in Showcase section) ──────────────────────────────────
function DashboardMockup() {
  const trades = [
    { symbol: 'XAUUSD', type: 'BUY',  pnl: +142.50 },
    { symbol: 'NAS100', type: 'SELL', pnl: -38.20  },
    { symbol: 'XAUUSD', type: 'BUY',  pnl: +88.00  },
    { symbol: 'NAS100', type: 'BUY',  pnl: +195.00 },
  ]
  const points = [30, 45, 38, 60, 52, 75, 65, 88, 78, 95, 85, 100]
  const w = 560, h = 80
  const xs = points.map((_, i) => (i / (points.length - 1)) * w)
  const ys = points.map(p => h - (p / 100) * h)
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const area = `${path} L${w},${h} L0,${h} Z`

  return (
    <div style={{ width: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* App topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogoMark size={20} />
          <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 700 }}>Velquor</span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {['Overview', 'Trading', 'Journal', 'Macro', 'VELQUOR'].map(t => (
            <span key={t} style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
              color: t === 'Overview' ? 'var(--ac)' : 'var(--t3)',
              background: t === 'Overview' ? 'rgba(77,143,255,0.12)' : 'transparent',
              fontWeight: t === 'Overview' ? 600 : 400,
            }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--t2)' }}>€</div>
          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(145deg, var(--ac), var(--pu))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white' }}>M</div>
        </div>
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Greeting */}
        <div>
          <p style={{ margin: 0, color: 'var(--t3)', fontSize: '11px' }}>Good morning, Marco</p>
          <p style={{ margin: '2px 0 0', color: 'var(--t1)', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em' }}>Your edge is working. Keep it clean today.</p>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { label: 'Today P&L',  value: '+€408.70', color: 'var(--gr2)', sub: '+3.4%' },
            { label: 'Win Rate',   value: '80%',       color: 'var(--ac)',  sub: 'Last 30d' },
            { label: 'Balance',    value: '€12,408',   color: 'var(--t1)', sub: 'MT5 live' },
            { label: 'Open Trades',value: '2',         color: 'var(--am2)', sub: 'XAUUSD · NAS' },
          ].map(m => (
            <div key={m.label} style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ margin: 0, color: 'var(--t3)', fontSize: '9px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</p>
              <p style={{ margin: '4px 0 2px', color: m.color, fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em' }}>{m.value}</p>
              <p style={{ margin: 0, color: 'var(--t3)', fontSize: '9px' }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart + trades side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Weekly equity chart */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ margin: 0, color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>Weekly P&L</p>
              <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '10px', fontWeight: 600 }}>+€1,243</p>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '52px', overflow: 'visible' }}>
              <defs>
                <linearGradient id="hcg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ac)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--ac)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#hcg)" />
              <path d={path} fill="none" stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3.5" fill="var(--ac)" />
            </svg>
          </div>

          {/* Recent trades */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <p style={{ margin: 0, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--t2)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Trades</p>
            {trades.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', borderBottom: i < trades.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '8px', padding: '2px 5px', borderRadius: '4px', fontWeight: 700,
                    background: t.type === 'BUY' ? 'rgba(0,255,133,0.12)' : 'rgba(255,51,71,0.12)',
                    color: t.type === 'BUY' ? 'var(--gr2)' : 'var(--re)',
                  }}>{t.type}</span>
                  <span style={{ color: 'var(--t1)', fontSize: '11px', fontWeight: 500 }}>{t.symbol}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
                  {t.pnl >= 0 ? '+' : ''}€{Math.abs(t.pnl).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* VELQUOR insight */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(77,143,255,0.06), rgba(168,126,255,0.06))',
          border: '1px solid rgba(77,143,255,0.15)', borderRadius: '10px', padding: '10px 14px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <LogoMark size={20} />
          <p style={{ margin: 0, color: 'var(--t2)', fontSize: '11px', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--ac)' }}>VELQUOR:</strong> Your XAUUSD win rate is 83% — highest of any instrument. ICT Order Block setups during London session are your strongest edge.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const { t } = useLocale()
  const [scrolled,   setScrolled]   = useState(false)
  const [loggedIn,   setLoggedIn]   = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [featOpen,   setFeatOpen]   = useState(false)
  const featRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => {
        if (data.user) setLoggedIn(true)
      })
    })
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const h = () => setMenuOpen(false)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [menuOpen])

  // Close features dropdown on outside click
  useEffect(() => {
    if (!featOpen) return
    const h = (e: MouseEvent) => {
      if (featRef.current && !featRef.current.contains(e.target as Node)) setFeatOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [featOpen])

  const FEATURES = [
    { icon: '◈', label: 'Overview', sub: 'P&L, win rate, net worth at a glance', href: '#features' },
    { icon: '◉', label: 'Trading', sub: 'Live positions, open trades, sync', href: '#features' },
    { icon: '▤', label: 'Journal', sub: 'Log trades, tag setups, review sessions', href: '#features' },
    { icon: '◆', label: 'Portfolio', sub: 'All accounts, all brokers in one view', href: '#features' },
    { icon: '◐', label: 'Macro', sub: 'Economic calendar & market context', href: '#features' },
    { icon: '✦', label: 'VELQUOR AI', sub: 'AI insights that read your trading', href: '#features' },
  ]

  const navLinkStyle = {
    color: 'rgba(255,255,255,0.65)', fontSize: '13.5px', fontWeight: 500,
    textDecoration: 'none', padding: '6px 2px', whiteSpace: 'nowrap' as const,
    transition: 'color 0.15s',
    cursor: 'pointer', background: 'none', border: 'none',
  }

  return (
    <>
      {/* Mobile backdrop */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        />
      )}

      {/* Mobile slide-down menu */}
      <div className="sm:hidden" style={{
        position: 'fixed', top: '62px', left: 0, right: 0, zIndex: 99,
        background: 'rgba(5,5,8,0.98)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none',
        borderRadius: '0 0 20px 20px',
        transform: menuOpen ? 'translateY(0)' : 'translateY(calc(-100% - 62px))',
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        padding: '12px 20px 28px',
        display: 'flex', flexDirection: 'column', gap: '2px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
      }}>
        {[['Features', '#features'], ['Pricing', '#pricing'], ['How it works', '#how']].map(([label, href]) => (
          <a key={label} href={href} onClick={() => setMenuOpen(false)} style={{
            color: 'var(--t1)', fontSize: '17px', fontWeight: 500,
            textDecoration: 'none', padding: '14px 4px',
            borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'block',
          }}>{label}</a>
        ))}
        <Link href="/trailer" onClick={() => setMenuOpen(false)} style={{
          color: '#FFB830', fontSize: '17px', fontWeight: 500,
          textDecoration: 'none', padding: '14px 4px',
          borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '11px' }}>▶</span> Watch Trailer
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <Link href="/login" onClick={() => setMenuOpen(false)} style={{
            color: 'var(--t1)', fontSize: '15px', fontWeight: 500,
            textDecoration: 'none', padding: '13px 18px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center',
          }}>{t.nav.signIn}</Link>
          <Link href="/login?mode=signup" onClick={() => setMenuOpen(false)} style={{
            background: '#fff', color: '#000', fontSize: '15px', fontWeight: 700,
            textDecoration: 'none', padding: '14px 18px', borderRadius: '10px',
            textAlign: 'center',
          }}>{t.nav.getStarted}</Link>
        </div>
      </div>

      {/* Features mega-dropdown */}
      {featOpen && (
        <div ref={featRef} style={{
          position: 'fixed', top: '62px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 101, width: '680px', maxWidth: 'calc(100vw - 32px)',
          background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          animation: 'featDropIn 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <style>{`@keyframes featDropIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
          <div style={{ display: 'flex' }}>
            {/* Left panel */}
            <div style={{
              width: '200px', flexShrink: 0, padding: '24px 20px',
              background: 'linear-gradient(160deg,#111 0%,#0a0a0a 100%)',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#FFB830,#F5B040)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#000' }}>V</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#F2F2F2', lineHeight: 1.3 }}>Your trading OS.<br/>All in one place.</div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>Track every trade, session, and insight — live from your broker.</div>
              <Link href="/login?mode=signup" onClick={() => setFeatOpen(false)} style={{
                marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, color: '#FFB830', textDecoration: 'none',
              }}>Get started →</Link>
            </div>
            {/* Right panel grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(255,255,255,0.06)' }}>
              {FEATURES.map((f) => (
                <a key={f.label} href={f.href} onClick={() => setFeatOpen(false)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px 18px',
                  background: '#0a0a0a', textDecoration: 'none',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#111')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0a0a0a')}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(77,143,255,0.1)', border: '1px solid rgba(77,143,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#4D8FFF', flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F2F2F2', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 11.5, color: '#555', lineHeight: 1.45 }}>{f.sub}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center',
        height: '62px',
        background: scrolled || menuOpen ? 'rgba(0,0,0,0.94)' : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(20px)' : 'none',
        borderBottom: scrolled || menuOpen ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        transition: 'background 0.25s, border-color 0.25s, backdrop-filter 0.25s',
        padding: '0 20px',
        gap: '32px',
      }}>

        {/* Logo */}
        <button onClick={() => {
          setMenuOpen(false); setFeatOpen(false)
          if (loggedIn) window.location.href = '/dashboard'
          else window.scrollTo({ top: 0, behavior: 'smooth' })
        }} style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px',
            padding: '5px 10px 5px 7px',
          }}>
            <LogoMark size={22} />
            <span style={{ color: '#F2F2F2', fontWeight: 700, fontSize: '13.5px', letterSpacing: '0.02em' }}>VELQUOR</span>
          </div>
        </button>

        {/* Desktop center links */}
        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '4px', flex: 1 }}>

          {/* Features dropdown trigger */}
          <button onClick={() => setFeatOpen(v => !v)} style={{
            ...navLinkStyle,
            display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '7px',
            color: featOpen ? '#F2F2F2' : 'rgba(255,255,255,0.65)',
            background: featOpen ? 'rgba(255,255,255,0.06)' : 'none',
          }}
            onMouseEnter={e => { if (!featOpen) e.currentTarget.style.color = '#F2F2F2' }}
            onMouseLeave={e => { if (!featOpen) e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
          >
            Features
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ opacity: 0.55, transform: featOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M2 4l3.5 3.5L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Pricing */}
          <Link href="/pricing" style={{ ...navLinkStyle, padding: '6px 10px', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none', color: 'rgba(255,255,255,0.65)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F2F2F2')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          >
            Pricing
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,184,48,0.15)', color: '#FFB830', border: '1px solid rgba(255,184,48,0.25)', letterSpacing: '0.03em' }}>FREE</span>
          </Link>

          {/* Trailer */}
          <Link href="/trailer" style={{ ...navLinkStyle, padding: '6px 10px', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F2F2F2')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ opacity: 0.7 }}>
              <path d="M3 2.5l7 4-7 4V2.5z" fill="currentColor"/>
            </svg>
            Trailer
          </Link>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: 'auto' }}>
          {/* Desktop */}
          <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '4px' }}>
            <Link href="/login" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: 'rgba(255,255,255,0.65)', fontSize: '13.5px', fontWeight: 500,
              textDecoration: 'none', padding: '6px 12px', borderRadius: '7px',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F2F2F2')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.7 }}>
                <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M2.5 12c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {t.nav.signIn}
            </Link>
            <Link href="/login?mode=signup" style={{
              background: '#fff', color: '#000', fontSize: '13.5px', fontWeight: 700,
              textDecoration: 'none', padding: '7px 18px', borderRadius: '8px',
              whiteSpace: 'nowrap', transition: 'background 0.15s, box-shadow 0.15s',
              boxShadow: '0 2px 12px rgba(255,255,255,0.12)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f0'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(255,255,255,0.12)' }}
            >{t.nav.getStarted}</Link>
          </div>

          {/* Mobile hamburger */}
          <button className="sm:hidden" onClick={() => { setMenuOpen(v => !v); setFeatOpen(false) }}
            aria-label="Menu" style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: menuOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: menuOpen ? '0px' : '5px', cursor: 'pointer', padding: 0, transition: 'all 0.2s',
            }}>
            <span style={{ display: 'block', width: '15px', height: '1.5px', background: '#F2F2F2', borderRadius: '2px', transform: menuOpen ? 'rotate(45deg) translateY(0.75px)' : 'none', transition: 'transform 0.22s' }} />
            <span style={{ display: 'block', width: '15px', height: '1.5px', background: '#F2F2F2', borderRadius: '2px', transform: menuOpen ? 'rotate(-45deg) translateY(-0.75px)' : 'none', transition: 'transform 0.22s' }} />
          </button>
        </div>
      </nav>
    </>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const { t } = useLocale()

  return (
    <section style={{ position: 'relative', paddingBottom: '0', background: '#000', overflow: 'hidden' }}>
      {/* Aurora bars at very top */}
      <Aurora />

      {/* Deep space background glows */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
          width: '90vw', height: '70vh', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(55,90,180,0.22) 0%, rgba(30,50,120,0.08) 45%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '20%', left: '-8%',
          width: '50vw', height: '50vw', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(33,110,210,0.10) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', top: '15%', right: '-8%',
          width: '45vw', height: '45vw', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(140,60,220,0.10) 0%, transparent 65%)',
        }} />
      </div>

      {/* Centered text block */}
      <div style={{
        position: 'relative', zIndex: 2,
        textAlign: 'center',
        padding: 'clamp(72px, 11vw, 120px) clamp(16px, 5vw, 48px) clamp(48px, 7vw, 72px)',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 14px', borderRadius: '20px', marginBottom: '32px',
          background: 'rgba(77,143,255,0.1)', border: '1px solid rgba(77,143,255,0.22)',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4B8FFF', display: 'block', boxShadow: '0 0 6px #4B8FFF' }} />
          <span style={{ color: '#4B8FFF', fontSize: '12px', fontWeight: 500 }}>{t.hero.badge}</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(44px, 8.5vw, 96px)', fontWeight: 900, lineHeight: 0.97,
          letterSpacing: '-0.04em', margin: '0 0 28px', color: '#fff',
        }}>
          {t.hero.h1a}<span style={{ color: 'rgba(255,255,255,0.3)' }}> /</span><br />
          {t.hero.h1b}
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(15px, 2.2vw, 19px)', color: 'rgba(255,255,255,0.52)',
          lineHeight: 1.65, margin: '0 auto 40px', maxWidth: '520px', fontWeight: 400,
        }}>
          {t.hero.subtitle}
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
          <Link href="/login?mode=signup" style={{
            background: '#fff', color: '#000', padding: '14px 30px', borderRadius: '8px',
            fontSize: '15px', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 24px rgba(255,255,255,0.15)', whiteSpace: 'nowrap',
          }}>{t.hero.cta}</Link>
          <a href="#showcase" style={{
            color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500,
            textDecoration: 'none', padding: '14px 8px',
          }}>{t.hero.ctaSub}</a>
          <Link href="/trailer" style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 500,
            textDecoration: 'none', padding: '14px 8px',
          }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid rgba(255,255,255,0.7)', marginLeft: '2px' }} />
            </span>
            Watch trailer
          </Link>
        </div>

        {/* Trust bullets */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {t.hero.trust.map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#00FF85', fontSize: '11px' }}>✓</span>
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trailer — centered 70%, with nebula glow */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', justifyContent: 'center', padding: '0 clamp(12px, 4vw, 48px)' }}>
        <div style={{ position: 'relative', width: '70%', maxWidth: '860px' }}>
          <div aria-hidden style={{
            position: 'absolute', inset: '-40px -60px',
            background: [
              'radial-gradient(ellipse at 25% 60%, rgba(33,110,243,0.25) 0%, transparent 55%)',
              'radial-gradient(ellipse at 75% 60%, rgba(196,50,220,0.20) 0%, transparent 55%)',
            ].join(', '),
            filter: 'blur(40px)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', zIndex: 1, borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <VelquorTrailerEmbed controls={false} loop={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard frame with gradient border */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 clamp(12px, 4vw, 48px)', marginTop: 'clamp(48px, 7vw, 80px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
          {/* Nebula glow behind the frame */}
          <div aria-hidden style={{
            position: 'absolute', inset: '-40px -60px 0',
            background: [
              'radial-gradient(ellipse at 20% 60%, rgba(33,110,243,0.28) 0%, transparent 55%)',
              'radial-gradient(ellipse at 80% 60%, rgba(196,50,220,0.22) 0%, transparent 55%)',
            ].join(', '),
            filter: 'blur(40px)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Gradient border wrapper */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'linear-gradient(90deg, #2196F3 0%, #7B2FBF 50%, #E040FB 100%)',
            padding: '1.5px',
            borderRadius: '14px 14px 0 0',
            boxShadow: [
              '0 0 60px rgba(33,150,243,0.22)',
              '0 0 120px rgba(224,64,251,0.14)',
              '0 -10px 60px rgba(33,100,200,0.12)',
            ].join(', '),
          }}>
            <div style={{ background: '#090D13', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
              {/* Browser chrome */}
              <div style={{
                background: 'rgba(10,14,20,0.98)', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {['rgba(255,95,87,0.8)', 'rgba(255,189,46,0.8)', 'rgba(40,201,64,0.8)'].map((c, i) => (
                    <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
                  ))}
                </div>
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px',
                  maxWidth: '320px', margin: '0 auto',
                }}>
                  <span style={{ color: '#00FF85', fontSize: '10px' }}>🔒</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>velquor.app/dashboard</span>
                </div>
                <div style={{ flexShrink: 0, width: '52px' }} />
              </div>
              <AnimatedDashboard />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar() {
  const { t } = useLocale()
  const values = [
    { value: 50000, suffix: '+' },
    { value: 23,    suffix: '%', prefix: '+' },
    { value: 1.2,   suffix: 's', decimals: 1 },
    { value: 12,    suffix: '' },
  ]
  return (
    <div style={{ borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)', background: 'var(--s1)' }}>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: 'clamp(24px, 5vw, 32px) clamp(16px, 5vw, 48px)',
        gap: '24px',
      }}>
        {t.stats.map((s, i) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(26px, 6vw, 34px)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              <Counter target={values[i].value} prefix={values[i].prefix ?? ''} suffix={values[i].suffix} decimals={values[i].decimals ?? 0} />
            </div>
            <div style={{ color: 'var(--t3)', fontSize: '12px', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Trading Tab Showcase ──────────────────────────────────────────────────────
function TradingTabMockup() {
  const tradeRows = [
    { symbol: 'XAUUSD', type: 'BUY',  open: '08:14', close: '10:32', setup: 'Order Block',    emotion: 'confident', pnl: +284.50, tags: ['London', 'ICT'] },
    { symbol: 'NAS100', type: 'SELL', open: '15:31', close: '15:58', setup: 'BOS / CHoCH',    emotion: 'neutral',   pnl: -112.20, tags: ['NY open', 'FOMO'] },
    { symbol: 'XAUUSD', type: 'BUY',  open: '09:02', close: '11:14', setup: 'Fair Value Gap', emotion: 'confident', pnl: +196.00, tags: ['London'] },
    { symbol: 'EURUSD', type: 'BUY',  open: '13:20', close: '14:05', setup: 'Support / Res',  emotion: 'neutral',   pnl: +44.80,  tags: ['NY'] },
    { symbol: 'NAS100', type: 'BUY',  open: '16:10', close: '17:30', setup: 'Trend Follow',   emotion: 'anxious',   pnl: -88.30,  tags: ['Revenge'] },
  ]
  const emotionColor: Record<string, string> = {
    confident: 'var(--gr2)', neutral: 'var(--t2)', anxious: 'var(--am2)', tired: 'var(--re)',
  }

  const equity = [10000, 10284, 10172, 10368, 10413, 10325, 10237, 10433, 10580, 10491, 10627, 10715]
  const w = 560, h = 80
  const min = Math.min(...equity), max = Math.max(...equity)
  const xs = equity.map((_, i) => (i / (equity.length - 1)) * w)
  const ys = equity.map(v => h - ((v - min) / (max - min)) * (h * 0.85) - h * 0.07)
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px', overflow: 'hidden',
      boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
    }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--bd)', background: 'var(--bg)',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {['Overview', 'Trading', 'Journal', 'Macro', 'VELQUOR'].map(t => (
            <span key={t} style={{
              fontSize: '10px', padding: '3px 7px', borderRadius: '5px',
              color: t === 'Trading' ? 'var(--ac)' : 'var(--t3)',
              background: t === 'Trading' ? 'rgba(77,143,255,0.12)' : 'transparent',
              fontWeight: t === 'Trading' ? 600 : 400,
              whiteSpace: 'nowrap',
            }}>{t}</span>
          ))}
        </div>
        <div className="hidden sm:flex" style={{ gap: '3px' }}>
          {['Today', 'Week', 'Month', 'All'].map(p => (
            <span key={p} style={{
              fontSize: '9px', padding: '3px 7px', borderRadius: '4px', cursor: 'default',
              color: p === 'Month' ? 'var(--t1)' : 'var(--t3)',
              background: p === 'Month' ? 'var(--s3)' : 'transparent',
              border: p === 'Month' ? '1px solid var(--bd2)' : '1px solid transparent',
            }}>{p}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Metrics */}
        <div className="grid grid-cols-3 sm:grid-cols-5" style={{ gap: '8px' }}>
          {[
            { label: 'Total P&L',    value: '+€1,824', color: 'var(--gr2)' },
            { label: 'Win Rate',     value: '67%',     color: 'var(--ac)' },
            { label: 'Profit Factor',value: '2.14',    color: 'var(--am2)' },
            { label: 'Avg Win',      value: '+€240',   color: 'var(--gr)' },
            { label: 'Avg Loss',     value: '−€100',   color: 'var(--re)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--s2)', borderRadius: '8px', padding: '9px 8px', border: '1px solid var(--bd)' }}>
              <p style={{ margin: 0, color: 'var(--t3)', fontSize: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.label}</p>
              <p style={{ margin: '3px 0 0', color: m.color, fontSize: '12px', fontWeight: 700 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Equity curve */}
        <div style={{ background: 'var(--s2)', borderRadius: '8px', padding: '12px', border: '1px solid var(--bd)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '10px', fontWeight: 500 }}>Equity Curve</p>
            <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '10px', fontWeight: 600 }}>+€1,824 this month</p>
          </div>
          <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '56px', overflow: 'visible' }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gr2)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--gr2)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#eqGrad)" />
            <path d={linePath} fill="none" stroke="var(--gr2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill="var(--gr2)" />
          </svg>
        </div>

        {/* Trade table — scrollable on mobile */}
        <div style={{ background: 'var(--s2)', borderRadius: '8px', border: '1px solid var(--bd)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '80px 50px 70px 110px 80px 1fr 60px',
              padding: '6px 11px', borderBottom: '1px solid var(--bd)',
              color: 'var(--t3)', fontSize: '8px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              minWidth: '460px',
            }}>
              <span>Symbol</span><span>Side</span><span>Time</span><span>Setup</span><span>Emotion</span><span>Tags</span><span style={{ textAlign: 'right' }}>P&L</span>
            </div>
            {tradeRows.map((t, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '80px 50px 70px 110px 80px 1fr 60px',
                padding: '7px 11px', borderBottom: i < tradeRows.length - 1 ? '1px solid var(--bd)' : 'none',
                alignItems: 'center', minWidth: '460px',
              }}>
                <span style={{ color: 'var(--t1)', fontSize: '10px', fontWeight: 600 }}>{t.symbol}</span>
                <span style={{
                  fontSize: '8px', padding: '2px 5px', borderRadius: '3px', fontWeight: 600, width: 'fit-content',
                  background: t.type === 'BUY' ? 'rgba(0,255,133,0.1)' : 'rgba(255,51,71,0.1)',
                  color: t.type === 'BUY' ? 'var(--gr2)' : 'var(--re)',
                }}>{t.type}</span>
                <span style={{ color: 'var(--t3)', fontSize: '9px' }}>{t.open}–{t.close}</span>
                <span style={{ color: 'var(--t2)', fontSize: '9px' }}>{t.setup}</span>
                <span style={{ color: emotionColor[t.emotion], fontSize: '9px', fontWeight: 500 }}>{t.emotion}</span>
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                  {t.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '8px', padding: '1px 5px', borderRadius: '3px',
                      background: 'var(--s3)', color: 'var(--t3)', border: '1px solid var(--bd)',
                    }}>{tag}</span>
                  ))}
                </div>
                <span style={{
                  textAlign: 'right', fontSize: '10px', fontWeight: 700,
                  color: t.pnl >= 0 ? 'var(--gr2)' : 'var(--re)',
                }}>{t.pnl >= 0 ? '+' : ''}€{Math.abs(t.pnl).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Before / After Mockup ─────────────────────────────────────────────────────
function BeforeAfterMockup() {
  const { t } = useLocale()
  const sc = t.showcase
  const [aiChars, setAiChars] = useState(0)
  const AI_TEXT = "ICT Order Block setups during London (08:00–11:00 CET) are your strongest edge — 78% win rate, avg +€142. Your NY open trades (15:30–16:00 CET) show a 28% win rate. Avoid NY open entirely and focus on London. Projected monthly uplift: +€680."

  useEffect(() => {
    const id = setInterval(() => {
      setAiChars(c => {
        if (c >= AI_TEXT.length) { clearInterval(id); return c }
        return c + 1
      })
    }, 24)
    return () => clearInterval(id)
  }, [])

  // BEFORE: choppy declining curve (starts high, trends down with big swings)
  const BW = 260, BH = 64
  const bPts = [10000, 9820, 10050, 9740, 9910, 9600, 9780, 9490, 9650, 9380, 9520, 9270]
  const bMin = Math.min(...bPts), bMax = Math.max(...bPts)
  const bXs = bPts.map((_, i) => (i / (bPts.length - 1)) * BW)
  const bYs = bPts.map(v => BH - ((v - bMin) / (bMax - bMin)) * (BH * 0.78) - BH * 0.11)
  const bLp = bXs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${bYs[i]}`).join(' ')
  const bAp = `${bLp} L${BW},${BH} L0,${BH} Z`

  // AFTER: smooth rising curve
  const aPts = [10000, 10180, 10140, 10360, 10310, 10560, 10490, 10740, 10680, 10960, 10880, 11200]
  const aMin = Math.min(...aPts), aMax = Math.max(...aPts)
  const aXs = aPts.map((_, i) => (i / (aPts.length - 1)) * BW)
  const aYs = aPts.map(v => BH - ((v - aMin) / (aMax - aMin)) * (BH * 0.78) - BH * 0.11)
  const aLp = aXs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${aYs[i]}`).join(' ')
  const aAp = `${aLp} L${BW},${BH} L0,${BH} Z`

  const beforeTrades = [
    { sym: 'NAS100', side: 'SELL', pnl: -188 },
    { sym: 'XAUUSD', side: 'BUY',  pnl: +44  },
    { sym: 'NAS100', side: 'BUY',  pnl: -211 },
    { sym: 'XAUUSD', side: 'SELL', pnl: -97  },
  ]

  const afterTrades = [
    { sym: 'XAUUSD', side: 'BUY',  setup: 'ICT Order Block', emotion: 'confident', pnl: +284, auto: true },
    { sym: 'XAUUSD', side: 'BUY',  setup: 'Fair Value Gap',  emotion: 'confident', pnl: +196, auto: true },
    { sym: 'NAS100', side: 'SELL', setup: 'BOS / CHoCH',     emotion: 'neutral',   pnl: -112, auto: true },
    { sym: 'EURUSD', side: 'BUY',  setup: 'Support / Res',   emotion: 'neutral',   pnl: +88,  auto: true },
  ]

  const card = (style: React.CSSProperties, children: React.ReactNode) => (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', ...style }}>
      {children}
    </div>
  )

  return (
    <div style={{ background: '#090D13', borderRadius: '14px', overflow: 'hidden' }}>
      {/* Shared topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.015)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LogoMark size={15} />
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px', fontWeight: 700 }}>VELQUOR</span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {['Overview','Trading','Journal','Macro','VELQUOR AI'].map(t => (
            <span key={t} style={{
              fontSize: '9px', padding: '3px 8px', borderRadius: '5px',
              color: t === 'Trading' ? '#4B8FFF' : 'rgba(255,255,255,0.28)',
              background: t === 'Trading' ? 'rgba(75,143,255,0.1)' : 'transparent',
              fontWeight: t === 'Trading' ? 600 : 400,
            }}>{t}</span>
          ))}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '20px',
          background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.2)',
        }}>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00FF85', display: 'block' }} />
          <span style={{ color: '#00FF85', fontSize: '9px', fontWeight: 500 }}>MT5 Live Sync</span>
        </div>
      </div>

      {/* Two-panel grid — stacks to column on mobile */}
      <style>{`
        @media (max-width: 639px) {
          .ba-grid { grid-template-columns: 1fr !important; }
          .ba-divider-v { display: none !important; }
          .ba-divider-h { display: block !important; }
        }
      `}</style>
      <div className="ba-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', minHeight: '340px' }}>

        {/* ── BEFORE panel ── */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,51,71,0.1)', border: '1px solid rgba(255,51,71,0.25)' }}>
              <span style={{ color: '#FF3347', fontSize: '10px', fontWeight: 700 }}>{sc.beforeLabel}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>{sc.beforeSub}</span>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
            {[
              { l: 'Win Rate', v: '29%', c: '#FF3347' },
              { l: 'Profit Factor', v: '0.72', c: '#FF9500' },
              { l: 'Monthly P&L', v: '−€730', c: '#FF3347' },
            ].map(m => (
              <div key={m.l} style={{ background: 'rgba(255,51,71,0.04)', borderRadius: '7px', padding: '7px 8px', border: '1px solid rgba(255,51,71,0.1)' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '8px' }}>{m.l}</p>
                <p style={{ margin: '2px 0 0', color: m.c, fontSize: '13px', fontWeight: 800, letterSpacing: '-0.02em' }}>{m.v}</p>
              </div>
            ))}
          </div>

          {/* Declining equity curve */}
          {card({}, <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 500 }}>Equity Curve</span>
              <span style={{ color: '#FF3347', fontSize: '9px', fontWeight: 700 }}>−€730 this month</span>
            </div>
            <svg viewBox={`0 0 ${BW} ${BH}`} style={{ width: '100%', height: '56px', overflow: 'visible' }}>
              <defs>
                <linearGradient id="bg-b" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF3347" stopOpacity="0.14"/>
                  <stop offset="100%" stopColor="#FF3347" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={bAp} fill="url(#bg-b)"/>
              <path d={bLp} fill="none" stroke="#FF3347" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx={bXs[bXs.length-1]} cy={bYs[bYs.length-1]} r="2.5" fill="#FF3347"/>
            </svg>
          </>)}

          {/* Trade list — no context, just raw */}
          {card({}, <>
            <p style={{ margin: '0 0 7px', color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trades — no context tracked</p>
            {beforeTrades.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < beforeTrades.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px', fontWeight: 700, background: t.side==='BUY'?'rgba(0,255,133,0.08)':'rgba(255,51,71,0.08)', color: t.side==='BUY'?'#00FF85':'#FF3347' }}>{t.side}</span>
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '9px', fontWeight: 500 }}>{t.sym}</span>
                  <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '8px' }}>— no setup, no notes</span>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 700, color: t.pnl >= 0 ? '#00FF85' : '#FF3347' }}>{t.pnl >= 0 ? '+' : ''}€{Math.abs(t.pnl)}</span>
              </div>
            ))}
          </>)}
        </div>

        {/* Vertical divider (desktop) */}
        <div className="ba-divider-v" style={{ background: 'rgba(255,255,255,0.07)', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#090D13', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px',
            padding: '4px 8px', whiteSpace: 'nowrap',
            color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em',
          }}>VS</div>
        </div>
        {/* Horizontal divider (mobile) */}
        <div className="ba-divider-h" style={{ display: 'none', height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 16px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#090D13', padding: '2px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 700 }}>VS</span>
        </div>

        {/* ── AFTER panel ── */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(0,255,133,0.1)', border: '1px solid rgba(0,255,133,0.25)' }}>
              <span style={{ color: '#00FF85', fontSize: '10px', fontWeight: 700 }}>{sc.afterLabel}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>{sc.afterSub}</span>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
            {[
              { l: 'Win Rate', v: '67%', c: '#00FF85' },
              { l: 'Profit Factor', v: '2.4x', c: '#FFB800' },
              { l: 'Monthly P&L', v: '+€1,847', c: '#00FF85' },
            ].map(m => (
              <div key={m.l} style={{ background: 'rgba(0,255,133,0.04)', borderRadius: '7px', padding: '7px 8px', border: '1px solid rgba(0,255,133,0.12)' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '8px' }}>{m.l}</p>
                <p style={{ margin: '2px 0 0', color: m.c, fontSize: '13px', fontWeight: 800, letterSpacing: '-0.02em' }}>{m.v}</p>
              </div>
            ))}
          </div>

          {/* Rising equity curve */}
          {card({}, <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 500 }}>Equity Curve</span>
              <span style={{ color: '#00FF85', fontSize: '9px', fontWeight: 700 }}>+€1,847 this month</span>
            </div>
            <svg viewBox={`0 0 ${BW} ${BH}`} style={{ width: '100%', height: '56px', overflow: 'visible' }}>
              <defs>
                <linearGradient id="bg-a" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FF85" stopOpacity="0.16"/>
                  <stop offset="100%" stopColor="#00FF85" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={aAp} fill="url(#bg-a)"/>
              <path d={aLp} fill="none" stroke="#00FF85" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx={aXs[aXs.length-1]} cy={aYs[aYs.length-1]} r="2.5" fill="#00FF85"/>
            </svg>
          </>)}

          {/* Auto-logged trades */}
          {card({}, <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Auto-journaled from MT5</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00FF85', display: 'block' }} />
                <span style={{ color: '#00FF85', fontSize: '8px' }}>Live sync</span>
              </div>
            </div>
            {afterTrades.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < afterTrades.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '7px', padding: '1px 4px', borderRadius: '3px', fontWeight: 700, background: t.side==='BUY'?'rgba(0,255,133,0.1)':'rgba(255,51,71,0.1)', color: t.side==='BUY'?'#00FF85':'#FF3347' }}>{t.side}</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px', fontWeight: 500 }}>{t.sym}</span>
                  <span style={{ color: '#4B8FFF', fontSize: '8px' }}>{t.setup}</span>
                  <span style={{ color: t.emotion === 'confident' ? '#00FF85' : 'rgba(255,255,255,0.35)', fontSize: '8px' }}>{t.emotion}</span>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 700, color: t.pnl >= 0 ? '#00FF85' : '#FF3347', flexShrink: 0 }}>{t.pnl >= 0 ? '+' : ''}€{Math.abs(t.pnl)}</span>
              </div>
            ))}
          </>)}

          {/* VELQUOR AI insight strip */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(75,143,255,0.07), rgba(123,47,191,0.07))',
            border: '1px solid rgba(75,143,255,0.18)', borderRadius: '8px', padding: '8px 10px',
            display: 'flex', gap: '8px', alignItems: 'flex-start',
          }}>
            <LogoMark size={18} />
            <div>
              <p style={{ margin: '0 0 2px', color: '#4B8FFF', fontSize: '8px', fontWeight: 600 }}>VELQUOR found a pattern</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '9px', lineHeight: 1.5 }}>
                {AI_TEXT.slice(0, aiChars)}
                {aiChars < AI_TEXT.length && (
                  <span style={{ display: 'inline-block', width: '1.5px', height: '10px', background: '#4B8FFF', marginLeft: '1px', animation: 'cursor-blink 0.7s step-end infinite', verticalAlign: 'text-bottom' }} />
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShowcaseSection() {
  const { t } = useLocale()
  const sc = t.showcase
  return (
    <section id="showcase" style={{
      position: 'relative', overflow: 'hidden',
      background: '#000',
      padding: 'clamp(60px, 10vw, 110px) clamp(16px, 5vw, 48px)',
    }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: '5%', left: '-8%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(33,110,243,0.22) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '0%', right: '-8%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(196,50,220,0.18) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '60vw', height: '30vh', background: 'radial-gradient(ellipse, rgba(55,80,160,0.12) 0%, transparent 70%)' }} />
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ color: '#4B8FFF', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{sc.eyebrow}</p>
          <h2 style={{ fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 16px', color: '#fff', lineHeight: 1.05 }}>
            {sc.h2a}<br />{sc.h2b}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(14px, 2vw, 16px)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.6 }}>
            {sc.subtitle}
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(90deg, #FF3347 0%, #7B2FBF 50%, #00FF85 100%)',
          padding: '1.5px', borderRadius: '16px',
          boxShadow: '0 0 60px rgba(255,51,71,0.12), 0 0 100px rgba(0,255,133,0.10)',
        }}>
          <BeforeAfterMockup />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px', marginTop: '28px' }}>
          {sc.cards.map(c => (
            <div key={c.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '20px', marginBottom: '10px' }}>{c.icon}</div>
              <h3 style={{ margin: '0 0 6px', color: '#fff', fontSize: '13px', fontWeight: 600 }}>{c.title}</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
function Features() {
  const { t } = useLocale()
  const ft = t.features
  const icons = ['⚡', '◆', '📊', '📓', '🏆', '📑']
  const colors = ['var(--go2)', 'var(--ac)', 'var(--cy)', 'var(--am2)', 'var(--gr2)', 'var(--pu)']

  return (
    <section id="features" style={{ padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{ft.eyebrow}</p>
        <h2 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)' }}>{ft.h2}</h2>
        <p style={{ color: 'var(--t2)', fontSize: '16px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>{ft.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: '14px' }}>
        {ft.items.map((f, i) => (
          <div key={f.title} style={{
            background: 'var(--s1)', border: '1px solid var(--bd)',
            borderRadius: '14px', padding: '22px', cursor: 'default',
            transition: 'border-color 0.2s, transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bd2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              background: `color-mix(in srgb, ${colors[i]} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${colors[i]} 30%, transparent)`,
            }}>{icons[i]}</div>
            <h3 style={{ margin: '0 0 7px', color: 'var(--t1)', fontSize: '14px', fontWeight: 600 }}>{f.title}</h3>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const { t } = useLocale()
  const hw = t.howItWorks
  const nums = ['01', '02', '03', '04']

  return (
    <section id="how" style={{
      padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)',
      background: 'var(--s1)', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{hw.eyebrow}</p>
          <h2 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)' }}>{hw.h2}</h2>
          <p style={{ color: 'var(--t2)', fontSize: '16px', maxWidth: '400px', margin: '0 auto' }}>{hw.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '24px', position: 'relative' }}>
          {hw.steps.map((s, i) => (
            <div key={nums[i]}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px', marginBottom: '18px',
                background: 'var(--bg)', border: '1px solid var(--bd2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '12px', color: 'var(--ac)',
                position: 'relative', zIndex: 1,
              }}>{nums[i]}</div>
              <h3 style={{ margin: '0 0 7px', color: 'var(--t1)', fontSize: '14px', fontWeight: 600 }}>{s.title}</h3>
              <p style={{ margin: '0 0 7px', color: 'var(--t2)', fontSize: '12px', lineHeight: 1.6 }}>{s.desc}</p>
              <p style={{ margin: 0, color: 'var(--t3)', fontSize: '11px', lineHeight: 1.5 }}>{s.detail}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <Link href="/login?mode=signup" style={{
            background: 'var(--ac)', color: 'white', padding: '13px 30px', borderRadius: '10px',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block',
            boxShadow: '0 8px 24px rgba(77,143,255,0.3)',
          }}>{hw.cta}</Link>
        </div>
      </div>
    </section>
  )
}

// ── VELQUOR AI section ─────────────────────────────────────────────────────────
function VelquorSection() {
  const { t } = useLocale()
  const ai = t.velquorAI
  const [active, setActive] = useState(0)

  return (
    <section style={{ padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(32px, 6vw, 72px)', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{ai.eyebrow}</p>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', color: 'var(--t1)', lineHeight: 1.15 }}>{ai.h2}</h2>
          <p style={{ color: 'var(--t2)', fontSize: '15px', lineHeight: 1.7, margin: '0 0 28px' }}>{ai.subtitle}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ai.qa.map((item, i) => (
              <button key={i} onClick={() => setActive(i)} style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                background: active === i ? 'rgba(77,143,255,0.1)' : 'transparent',
                border: active === i ? '1px solid rgba(77,143,255,0.3)' : '1px solid transparent',
                color: active === i ? 'var(--t1)' : 'var(--t2)',
                fontSize: '13px', transition: 'all 0.15s',
              }}>
                {active === i ? '→ ' : ''}{item.q}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogoMark size={26} />
            <div>
              <p style={{ margin: 0, color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>VELQUOR</p>
              <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '10px' }}>● {ai.online}</p>
            </div>
          </div>

          <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: 'var(--ac)', color: 'white', padding: '9px 13px', borderRadius: '11px 11px 2px 11px', fontSize: '13px', maxWidth: '80%' }}>
                {ai.qa[active].q}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
              <LogoMark size={26} />
              <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', padding: '11px 13px', borderRadius: '2px 11px 11px 11px', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.65, maxWidth: '85%' }}>
                {ai.qa[active].a}
              </div>
            </div>
          </div>

          <div style={{ padding: '11px 14px', borderTop: '1px solid var(--bd)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '9px', padding: '9px 13px' }}>
              <span style={{ color: 'var(--t3)', fontSize: '12px', flex: 1 }}>{ai.placeholder}</span>
              <span style={{ background: 'var(--ac)', color: 'white', fontSize: '10px', padding: '3px 9px', borderRadius: '5px', fontWeight: 500 }}>Send</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Prop Firm section ─────────────────────────────────────────────────────────
function PropFirmSection() {
  const { t } = useLocale()
  const pf = t.propFirm

  return (
    <section style={{ padding: '0 clamp(16px, 5vw, 48px) clamp(60px, 10vw, 100px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,255,133,0.04) 0%, rgba(77,143,255,0.04) 100%)',
        border: '1px solid rgba(0,255,133,0.15)', borderRadius: '20px',
        padding: 'clamp(28px, 5vw, 56px) clamp(20px, 5vw, 60px)',
      }}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(32px, 5vw, 60px)', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', marginBottom: '20px', background: 'rgba(0,255,133,0.1)', border: '1px solid rgba(0,255,133,0.25)' }}>
              <span style={{ color: 'var(--gr2)', fontSize: '12px', fontWeight: 500 }}>{pf.badge}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)', lineHeight: 1.2 }}>{pf.h2}</h2>
            <p style={{ color: 'var(--t2)', fontSize: '14px', lineHeight: 1.7, margin: '0 0 22px' }}>{pf.subtitle}</p>
            {pf.firms.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--gr2)', fontSize: '11px' }}>✓</span>
                <span style={{ color: 'var(--t2)', fontSize: '13px' }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '14px', padding: '22px' }}>
            <p style={{ margin: '0 0 18px', color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>FTMO Challenge — Phase 1</p>
            {[
              { label: 'Profit Target',  current: 6.8, max: 10, color: 'var(--gr2)', unit: '%' },
              { label: 'Max Daily Loss', current: 1.2, max: 5,  color: 'var(--go2)', unit: '%' },
              { label: 'Max Drawdown',   current: 2.1, max: 10, color: 'var(--ac)',  unit: '%' },
              { label: 'Trading Days',   current: 7,   max: 10, color: 'var(--pu)',  unit: ' days' },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--t2)', fontSize: '11px' }}>{r.label}</span>
                  <span style={{ color: r.color, fontSize: '11px', fontWeight: 600 }}>{r.current}{r.unit} / {r.max}{r.unit}</span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: 'var(--s3)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: `${(r.current / r.max) * 100}%`, background: r.color }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: '16px', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,255,133,0.07)', border: '1px solid rgba(0,255,133,0.18)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ color: 'var(--gr2)', fontSize: '13px' }}>●</span>
              <span style={{ color: 'var(--gr2)', fontSize: '11px', fontWeight: 500 }}>{pf.trackNote}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function Pricing() {
  const { t } = useLocale()
  const pr = t.pricing

  return (
    <section id="pricing" style={{
      padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)',
      borderTop: '1px solid var(--bd)', background: 'var(--s1)',
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>{pr.eyebrow}</p>
          <h2 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)' }}>{pr.h2}</h2>
          <p style={{ color: 'var(--t2)', fontSize: '15px', lineHeight: 1.6, margin: '0 auto', maxWidth: '400px' }}>{pr.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '16px', alignItems: 'start' }}>
          {pr.tiers.map((tier, i) => {
            const isHighlighted = i === 1
            return (
              <div key={tier.name} style={{
                background: isHighlighted ? 'linear-gradient(160deg, rgba(77,143,255,0.07) 0%, var(--s1) 60%)' : 'var(--s1)',
                border: `1px solid ${isHighlighted ? 'rgba(77,143,255,0.35)' : 'var(--bd)'}`,
                borderRadius: '16px', padding: '28px', position: 'relative',
                boxShadow: isHighlighted ? '0 0 0 1px rgba(77,143,255,0.12), 0 24px 60px rgba(0,0,0,0.3)' : 'none',
              }}>
                {isHighlighted && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--ac)', color: 'white', fontSize: '11px', fontWeight: 600,
                    padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(77,143,255,0.4)',
                  }}>Most popular</div>
                )}
                <p style={{ color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>{tier.name}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', margin: '0 0 6px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--t1)', lineHeight: 1 }}>{tier.price}</span>
                  <span style={{ color: 'var(--t3)', fontSize: '13px', paddingBottom: '6px' }}>{tier.period}</span>
                </div>
                <p style={{ color: 'var(--t3)', fontSize: '12px', margin: '0 0 24px', lineHeight: 1.5 }}>{tier.tagline}</p>

                <Link href="/login?mode=signup" style={{
                  display: 'block', textAlign: 'center', padding: '11px', borderRadius: '9px',
                  fontSize: '13px', fontWeight: 600, textDecoration: 'none', marginBottom: '22px',
                  background: isHighlighted ? 'var(--ac)' : 'var(--s2)',
                  color: isHighlighted ? 'white' : 'var(--t1)',
                  border: isHighlighted ? 'none' : '1px solid var(--bd2)',
                  boxShadow: isHighlighted ? '0 4px 16px rgba(77,143,255,0.3)' : 'none',
                }}>{tier.cta}</Link>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {tier.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                      <span style={{ color: isHighlighted ? 'var(--ac)' : 'var(--gr2)', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                      <span style={{ color: 'var(--t2)', fontSize: '12px', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--t3)', fontSize: '12px', marginTop: '28px', lineHeight: 1.6 }}>{pr.footer}</p>
      </div>
    </section>
  )
}

// ── Footer tagline ────────────────────────────────────────────────────────────
function FooterTagline() {
  return (
    <div style={{
      background: '#000',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: 'clamp(40px, 7vw, 72px) clamp(16px, 4vw, 40px)',
      overflow: 'hidden',
    }}>
      <p style={{
        fontSize: 'clamp(36px, 7.5vw, 96px)',
        fontWeight: 900,
        letterSpacing: '-0.04em',
        lineHeight: 0.92,
        color: '#fff',
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'clip',
      }}>
        KNOW EVERY TRADE<span style={{ color: 'rgba(255,255,255,0.25)' }}> /</span> OWN YOUR EDGE.
      </p>
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const { t } = useLocale()
  const fo = t.footer

  return (
    <footer style={{
      borderTop: '1px solid var(--bd)',
      padding: 'clamp(24px, 4vw, 36px) clamp(16px, 5vw, 48px)',
      display: 'flex', flexDirection: 'column', gap: '20px',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogoMark size={20} />
          <span style={{ color: 'var(--t3)', fontSize: '12px' }}>{fo.copyright}</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {fo.links.map(l => (
            <a key={l} href="#" style={{ color: 'var(--t3)', fontSize: '12px', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </div>

      {/* Impressum — legally required in Austria (§ 25 MedienG / § 5 ECG) */}
      <div style={{ borderTop: '1px solid var(--bd)', paddingTop: '16px', color: 'var(--t3)', fontSize: '11px', lineHeight: 1.8 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '10px' }}>{fo.impressumLabel}</p>
        <p style={{ margin: 0 }}>
          Medieninhaber &amp; Herausgeber: Marco Brini · Ägydygasse 14, 8020 Graz, Austria · E-Mail:{' '}
          <a href="mailto:support@velquor.app" style={{ color: 'var(--t3)', textDecoration: 'none' }}>support@velquor.app</a>
          {' '}· Angaben gemäß § 25 MedienG und § 5 ECG
        </p>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('velquor-intro-seen')) {
      setShowSplash(true)
    }
  }, [])

  function handleSplashDone() {
    sessionStorage.setItem('velquor-intro-seen', '1')
    setShowSplash(false)
  }

  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflowX = 'hidden'
    document.documentElement.style.overflowX = 'hidden'
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.overflowX = ''
      document.documentElement.style.overflowX = ''
    }
  }, [])

  return (
    <>
      {showSplash && <IntroSplash onDone={handleSplashDone} />}
      <div style={{ background: 'var(--bg)', color: 'var(--t1)', overflowX: 'hidden' }}>
        <Nav />
        <Hero />
        <StatsBar />
        <ShowcaseSection />
        <Features />
        <HowItWorks />
        <VelquorSection />
        <PropFirmSection />
        <Pricing />
        <FooterTagline />
        <Footer />
      </div>
    </>
  )
}
