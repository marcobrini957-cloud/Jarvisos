'use client'

import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'

const VELQUOR_TEXT = "Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. You're trading against institutional order flow before direction is established. Consider a 30-minute wait rule. Your London-only NAS100 trades hit 71% win rate."

const CURSOR_SVG_PATH = "M1 1 L1 13.5 L4.2 10.2 L6.5 16.5 L8.8 15.5 L6.5 9.2 L11.5 9.2 Z"

// Mirrors the real dashboard ticker tape (TradingView embed on velquor.app)
const TICKER = [
  { sym: 'GOLD',    price: '3,412.4', chg: '+0.82%', up: true  },
  { sym: 'NAS100',  price: '23,186',  chg: '−0.34%', up: false },
  { sym: 'EUR/USD', price: '1.0847',  chg: '+0.11%', up: true  },
  { sym: 'S&P 500', price: '6,241',   chg: '+0.27%', up: true  },
  { sym: 'DAX',     price: '18,904',  chg: '−0.18%', up: false },
  { sym: 'BTC',     price: '118,240', chg: '+1.94%', up: true  },
]

export function AnimatedDashboard() {
  const TAB_NAMES    = ['Overview', 'Trading', 'Journal', 'Copy', 'VELQUOR']
  const STEPS        = 5
  const NEXT_TAB_IDX = [1, 2, 3, 4, 0]

  const DRIFT_EASE = 520   // ms per drift transition
  const DRIFT_INTV = 470   // ms between drift starts — less than DRIFT_EASE so next fires before current arrives

  // Cursor never stops: 5 waypoints per tab the cursor drifts through naturally
  const DRIFT_PATHS = [
    [[0.64,0.28],[0.76,0.34],[0.55,0.42],[0.38,0.37],[0.60,0.45]], // Overview: metrics → chart → trades
    [[0.60,0.42],[0.70,0.54],[0.48,0.62],[0.36,0.44],[0.64,0.58]], // Trading: live chart → trade log
    [[0.26,0.40],[0.18,0.48],[0.32,0.44],[0.70,0.54],[0.52,0.62]], // Journal: calendar → entry
    [[0.30,0.38],[0.52,0.46],[0.72,0.40],[0.58,0.60],[0.40,0.66]], // Copy: master → slaves → log
    [[0.58,0.50],[0.34,0.46],[0.66,0.64],[0.46,0.62],[0.56,0.72]], // VELQUOR: chips → chat
  ] as const

  const CONTENT_FRAC = [
    [0.60,0.34],[0.57,0.50],[0.30,0.46],[0.44,0.42],[0.54,0.67],
  ] as const

  const INTER_FRAC = [
    [0.50,0.18],[0.55,0.20],[0.44,0.17],[0.52,0.19],[0.40,0.28],
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

  const activeTab    = step
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
      const nextStep = (step + 1) % STEPS
      const [nfx, nfy] = CONTENT_FRAC[nextStep]
      go(nfx, nfy, 480, '0.25,0.46,0.45,0.94')

      clearInterval(progId)
      setProgress(100)
      setVisible(false)
      setVELQUORChars(0)

      setTimeout(() => {
        setStep(s => (s + 1) % STEPS)
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
    if (step !== 4 || !visible) return
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

  // Candles for the Live Chart mock (mirrors the TradingView embed in the real Trading tab)
  // [open, high, low, close] on a 0–100 scale
  const candles = [
    [38,52,34,48],[48,58,44,55],[55,60,42,45],[45,50,36,40],[40,56,38,53],
    [53,64,50,61],[61,66,54,57],[57,62,48,52],[52,68,50,65],[65,74,62,70],
    [70,76,60,63],[63,72,61,69],[69,80,66,77],[77,82,70,73],[73,84,71,81],
  ]

  const trades = [
    { sym: 'XAUUSD', type: 'BUY',  pnl: +284.50, setup: 'Order Block', session: 'London',  res: 'W'  },
    { sym: 'NAS100', type: 'SELL', pnl: -112.20, setup: 'BOS/CHoCH',   session: 'NY',      res: 'L'  },
    { sym: 'XAUUSD', type: 'BUY',  pnl: +196.00, setup: 'FVG',         session: 'London',  res: 'W'  },
    { sym: 'XAUUSD', type: 'SELL', pnl:   +6.40, setup: 'Liq. Grab',   session: 'NY',      res: 'BE' },
  ]

  const calWins   = [1, 3, 6, 8, 9, 10]
  const calLosses = [2, 7]

  const copyLog = [
    { action: 'OPEN',  sym: 'XAUUSD', lots: '0.50 → 0.25', target: 'Blueberry #221', ms: '0.9s', ok: true },
    { action: 'OPEN',  sym: 'XAUUSD', lots: '0.50 → 0.10', target: 'FTMO #58',       ms: '1.2s', ok: true },
    { action: 'CLOSE', sym: 'NAS100', lots: '0.30 → 0.15', target: 'Blueberry #221', ms: '0.8s', ok: true },
  ]

  return (
    <>
      <style>{`
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes cursor-click { 0%{transform:scale(0.2);opacity:1} 100%{transform:scale(2.6);opacity:0} }
        @keyframes vq-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
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

        {/* Live market ticker — mirrors the real dashboard's TradingView tape */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '18px',
          padding: '5px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          overflow: 'hidden', whiteSpace: 'nowrap',
        }}>
          {TICKER.map(q => (
            <span key={q.sym} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              <span style={{ color: 'var(--t2)', fontSize: '8.5px', fontWeight: 600 }}>{q.sym}</span>
              <span style={{ color: 'var(--t1)', fontSize: '8.5px' }}>{q.price}</span>
              <span style={{ color: q.up ? 'var(--gr2)' : 'var(--re)', fontSize: '8.5px', fontWeight: 600 }}>{q.chg}</span>
            </span>
          ))}
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
                  { label: 'Today P&L',    value: '+€408.70', color: 'var(--gr2)' },
                  { label: 'Win Rate',     value: '67%',      color: 'var(--ac)'  },
                  { label: 'Balance',      value: '€12,408',  color: 'var(--t1)'  },
                  { label: 'Streak',       value: '🔥 12d',   color: 'var(--am2)' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '9px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</p>
                    <p style={{ margin: '3px 0 0', color: m.color, fontSize: '13px', fontWeight: 700 }}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ margin: '0 0 8px', color: 'var(--t2)', fontSize: '10px', fontWeight: 600 }}>Equity Curve</p>
                  <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '44px', overflow: 'visible' }}>
                    <defs><linearGradient id="g-ov" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--ac)" stopOpacity="0.25"/><stop offset="100%" stopColor="var(--ac)" stopOpacity="0"/></linearGradient></defs>
                    <path d={ap} fill="url(#g-ov)"/>
                    <path d={lp} fill="none" stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill="var(--ac)"/>
                  </svg>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <p style={{ margin: 0, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t2)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily P&L Calendar · July</p>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '3px' }}>
                      {['M','T','W','T','F','S','S'].map((d, i) => (
                        <div key={i} style={{ textAlign: 'center', fontSize: '7px', color: 'var(--t3)', fontWeight: 600 }}>{d}</div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                      {[null,null,1,2,3,4,5,6,7,8,9,10,11,12,13].map((d, i) => (
                        <div key={i} style={{
                          textAlign: 'center', fontSize: '8px', padding: '2px 1px', borderRadius: '3px',
                          color: d===13?'white':d?'var(--t2)':'transparent',
                          background: d===13?'var(--ac)':d&&calWins.includes(d)?'rgba(0,255,133,0.18)':d&&calLosses.includes(d)?'rgba(255,51,71,0.15)':'transparent',
                          fontWeight: d===13?700:400,
                        }}>{d||''}</div>
                      ))}
                    </div>
                  </div>
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
                  { label: 'Max DD',       value: '−€310',   color: 'var(--re)'  },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '9px 8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</p>
                    <p style={{ margin: '3px 0 0', color: m.color, fontSize: '12px', fontWeight: 700 }}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--t2)', fontSize: '10px', fontWeight: 600 }}>Live Chart · XAUUSD · 1H</p>
                  <p style={{ margin: 0, color: 'var(--t3)', fontSize: '8px' }}>TradingView</p>
                </div>
                <svg viewBox="0 0 500 64" style={{ width: '100%', height: '56px', overflow: 'visible' }}>
                  {candles.map(([o, h, l, c], i) => {
                    const x = 12 + i * 33
                    const up = c >= o
                    const col = up ? 'var(--gr2)' : 'var(--re)'
                    const y = (v: number) => 64 - (v / 100) * 60
                    return (
                      <g key={i}>
                        <line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={col} strokeWidth="1" opacity="0.7"/>
                        <rect x={x - 4} width="8" y={y(Math.max(o, c))} height={Math.max(2, Math.abs(y(o) - y(c)))} fill={col} rx="1"/>
                      </g>
                    )
                  })}
                </svg>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '76px 42px 76px 1fr 30px 58px', padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t3)', fontSize: '7px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  <span>Pair</span><span>Side</span><span>Setup</span><span>Session</span><span></span><span style={{ textAlign: 'right' }}>P&L</span>
                </div>
                {trades.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '76px 42px 76px 1fr 30px 58px', padding: '6px 12px', borderBottom: i < trades.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center', background: i===0?'rgba(0,255,133,0.03)':'transparent' }}>
                    <span style={{ color: 'var(--t1)', fontSize: '10px', fontWeight: 600 }}>{t.sym}</span>
                    <span style={{ fontSize: '7px', padding: '2px 4px', borderRadius: '3px', fontWeight: 700, width: 'fit-content', background: t.type==='BUY'?'rgba(0,255,133,0.1)':'rgba(255,51,71,0.1)', color: t.type==='BUY'?'var(--gr2)':'var(--re)' }}>{t.type}</span>
                    <span style={{ color: 'var(--t2)', fontSize: '9px' }}>{t.setup}</span>
                    <span style={{ color: 'var(--t3)', fontSize: '9px' }}>{t.session}</span>
                    <span style={{
                      fontSize: '7px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', width: 'fit-content',
                      background: t.res==='W'?'rgba(0,255,133,0.14)':t.res==='L'?'rgba(255,51,71,0.14)':'rgba(77,143,255,0.12)',
                      color: t.res==='W'?'var(--gr2)':t.res==='L'?'var(--re)':'var(--ac)',
                    }}>{t.res}</span>
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
                  <p style={{ margin: '0 0 10px', color: 'var(--t2)', fontSize: '10px', fontWeight: 600 }}>July 2026</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
                    {['M','T','W','T','F','S','S'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontSize: '7px', color: 'var(--t3)', fontWeight: 600 }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                    {[null,null,1,2,3,4,5,6,7,8,9,10,11,12,13].map((d, i) => (
                      <div key={i} style={{
                        textAlign: 'center', fontSize: '8px', padding: '2px 1px', borderRadius: '3px',
                        color: d===13?'white':d?'var(--t2)':'transparent',
                        background: d===13?'var(--ac)':d&&calWins.includes(d)?'rgba(0,255,133,0.18)':d&&calLosses.includes(d)?'rgba(255,51,71,0.15)':'transparent',
                        fontWeight: d===13?700:400,
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
                  { label: 'Weekly AI Review', value: 'Grade A−', icon: '🤖' },
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

          {/* ── COPY TRADING ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--t1)', fontSize: '12px', fontWeight: 700 }}>Trade Copier · Main Group</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '9px' }}>1 master → 2 slave accounts · proportional lots</p>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.2)', color: 'var(--gr2)', fontSize: '9px', padding: '3px 9px', borderRadius: '20px', fontWeight: 600 }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', animation: 'vq-pulse 1.4s ease-in-out infinite' }} />
                  ACTIVE
                </span>
              </div>

              {/* Master → slaves flow */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: '6px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(77,143,255,0.05)', border: '1px solid rgba(77,143,255,0.25)', borderRadius: '8px', padding: '10px 12px' }}>
                  <p style={{ margin: 0, color: 'var(--ac)', fontSize: '7px', fontWeight: 700, letterSpacing: '0.08em' }}>MASTER</p>
                  <p style={{ margin: '3px 0 0', color: 'var(--t1)', fontSize: '11px', fontWeight: 700 }}>Blueberry · #114 892</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '8.5px' }}>€12,408 · EA connected</p>
                </div>
                <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: '13px' }}>→</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[
                    { name: 'Blueberry · #221 040', bal: '€6,180 · 0.5× lots' },
                    { name: 'FTMO Challenge · #58 112', bal: '€10,000 · 0.2× lots' },
                  ].map(s => (
                    <div key={s.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '7px', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--t1)', fontSize: '9.5px', fontWeight: 600 }}>{s.name}</p>
                        <p style={{ margin: '1px 0 0', color: 'var(--t3)', fontSize: '8px' }}>{s.bal}</p>
                      </div>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Signal log */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <p style={{ margin: 0, padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t2)', fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signal Log</p>
                {copyLog.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderBottom: i < copyLog.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <span style={{ fontSize: '7px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: l.action==='OPEN'?'rgba(0,255,133,0.12)':'rgba(255,176,48,0.12)', color: l.action==='OPEN'?'var(--gr2)':'var(--am2)' }}>{l.action}</span>
                    <span style={{ color: 'var(--t1)', fontSize: '9.5px', fontWeight: 600, minWidth: '48px' }}>{l.sym}</span>
                    <span style={{ color: 'var(--t3)', fontSize: '9px', flex: 1 }}>{l.lots} · {l.target}</span>
                    <span style={{ color: 'var(--gr2)', fontSize: '8.5px', fontWeight: 600 }}>✓ {l.ms}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VELQUOR ── */}
          {step === 4 && (
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
