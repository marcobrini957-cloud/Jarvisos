'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/ui/LogoMark'

type Mode = 'signin' | 'signup' | 'reset'

// ── Aurora data bars (matches landing page) ───────────────────────────────────
function Aurora() {
  const bars = Array.from({ length: 40 }, (_, i) => {
    const colors = ['#FF2D9A', '#E040FB', '#7B61FF', '#4BC0FF', '#FF6B9D', '#A78BFA']
    return {
      left: `${(i / 40) * 100}%`,
      height: `${28 + Math.abs(Math.sin(i * 1.71)) * 60}px`,
      width: `${i % 3 === 0 ? 2.5 : i % 3 === 1 ? 1.5 : 1}px`,
      color: colors[i % colors.length],
      delay: `${((i * 0.09) % 2.8).toFixed(2)}s`,
      duration: `${(1.6 + (i * 0.17) % 1.8).toFixed(2)}s`,
      anim: i % 2 === 0 ? 'lp-aurora-a' : 'lp-aurora-b',
    }
  })
  return (
    <>
      <style>{`
        @keyframes lp-aurora-a { 0%,100%{opacity:.7;transform:scaleY(1)} 50%{opacity:.06;transform:scaleY(.4)} }
        @keyframes lp-aurora-b { 0%,100%{opacity:.35;transform:scaleY(.75)} 50%{opacity:.08;transform:scaleY(.35)} }
      `}</style>
      <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '90px', zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
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

// ── Animated dashboard preview ─────────────────────────────────────────────────
const CURSOR_PATH = "M1 1 L1 13.5 L4.2 10.2 L6.5 16.5 L8.8 15.5 L6.5 9.2 L11.5 9.2 Z"

function LoginDashboardPreview() {
  const TAB_NAMES    = ['Overview', 'Trading', 'Journal', 'VELQUOR AI']
  const TAB_ORDER    = [0, 1, 2, 3]
  const NEXT_TAB_IDX = [1, 2, 3, 0]

  const DRIFT_EASE = 480
  const DRIFT_INTV = 420

  const DRIFT_PATHS = [
    [[0.62,0.30],[0.74,0.38],[0.52,0.46],[0.36,0.40],[0.58,0.50]],
    [[0.58,0.44],[0.68,0.56],[0.46,0.64],[0.34,0.46],[0.62,0.60]],
    [[0.24,0.42],[0.16,0.50],[0.30,0.46],[0.68,0.56],[0.50,0.64]],
    [[0.56,0.52],[0.32,0.48],[0.64,0.66],[0.44,0.64],[0.54,0.74]],
  ] as const

  const CONTENT_FRAC = [[0.58,0.36],[0.55,0.52],[0.28,0.48],[0.52,0.70]] as const
  const INTER_FRAC   = [[0.48,0.20],[0.53,0.22],[0.42,0.19],[0.38,0.30]] as const

  const [step,    setStep]    = useState(0)
  const [visible, setVisible] = useState(true)
  const [progress,setProgress]= useState(0)
  const [aiChars, setAiChars] = useState(0)
  const [cursorX, setCursorX] = useState(0)
  const [cursorY, setCursorY] = useState(0)
  const [cursorEase, setCursorEase] = useState(DRIFT_EASE)
  const [cursorCubic, setCursorCubic] = useState('0.45,0,0.55,1')
  const [cursorClicking, setCursorClicking] = useState(false)

  const activeTab = TAB_ORDER[step]
  const containerRef = useRef<HTMLDivElement>(null)
  const tabPtsRef    = useRef<Array<{x:number;y:number}>>([])
  const cursorPosRef = useRef({ x: 0, y: 0 })

  const AI_TEXT = "Your XAUUSD win rate is 83% — your strongest edge. ICT Order Block setups during London are working. NAS100 trades before NY open are dragging your stats down."

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return
      const box  = containerRef.current.getBoundingClientRect()
      const tabs = containerRef.current.querySelectorAll<HTMLElement>('[data-lptab]')
      tabPtsRef.current = Array.from(tabs).map(el => {
        const r = el.getBoundingClientRect()
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
      })
      if (cursorPosRef.current.x === 0 && box.width > 0) {
        const ix = box.width * 0.60, iy = box.height * 0.30
        setCursorX(ix); setCursorY(iy); cursorPosRef.current = { x: ix, y: iy }
      }
    }
    const t = setTimeout(measure, 80)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const ids: ReturnType<typeof setTimeout>[] = []

    const go = (fx: number, fy: number, ease: number, cubic: string) => {
      if (!containerRef.current) return
      const { width: W, height: H } = containerRef.current.getBoundingClientRect()
      if (!W) return
      const tx = W * fx, ty = H * fy
      setCursorEase(ease); setCursorCubic(cubic)
      setCursorX(tx); setCursorY(ty)
      cursorPosRef.current = { x: tx, y: ty }
    }

    const drifts = DRIFT_PATHS[step]
    drifts.forEach(([fx, fy], i) => {
      ids.push(setTimeout(() => go(fx, fy, DRIFT_EASE, '0.45,0,0.55,1'), i * DRIFT_INTV))
    })

    let prog = 0
    const progId = setInterval(() => {
      prog = Math.min(prog + 100 / (2900 / 40), 100)
      setProgress(prog)
    }, 40)

    ids.push(setTimeout(() => { const [ix, iy] = INTER_FRAC[step]; go(ix, iy, 240, '0.4,0,0.2,1') }, 2100))
    ids.push(setTimeout(() => {
      const tab = tabPtsRef.current[NEXT_TAB_IDX[step]]
      if (tab && containerRef.current) {
        setCursorEase(110); setCursorCubic('0.16,1,0.3,1')
        setCursorX(tab.x); setCursorY(tab.y)
        cursorPosRef.current = { x: tab.x, y: tab.y }
      }
    }, 2400))
    ids.push(setTimeout(() => setCursorClicking(true),  2500))
    ids.push(setTimeout(() => setCursorClicking(false), 2720))
    ids.push(setTimeout(() => {
      const nextStep = (step + 1) % 4
      const [nfx, nfy] = CONTENT_FRAC[nextStep]
      go(nfx, nfy, 440, '0.25,0.46,0.45,0.94')
      clearInterval(progId); setProgress(100); setVisible(false); setAiChars(0)
      setTimeout(() => { setStep(s => (s + 1) % 4); setProgress(0); setVisible(true) }, 240)
    }, 2600))

    return () => { ids.forEach(clearTimeout); clearInterval(progId) }
  }, [step])

  useEffect(() => {
    if (step !== 3 || !visible) return
    let i = 0
    const id = setInterval(() => { i++; setAiChars(i); if (i >= AI_TEXT.length) clearInterval(id) }, 20)
    return () => clearInterval(id)
  }, [step, visible])

  // Chart data
  const pts = [28, 44, 36, 58, 50, 73, 63, 86, 76, 93, 83, 100]
  const CW = 400, CH = 50
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * CW)
  const ys = pts.map(p => CH - (p / 100) * CH * 0.88 - CH * 0.06)
  const lp = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const ap = `${lp} L${CW},${CH} L0,${CH} Z`

  const trades = [
    { sym: 'XAUUSD', type: 'BUY',  pnl: +284.50 },
    { sym: 'NAS100', type: 'SELL', pnl: -112.20 },
    { sym: 'XAUUSD', type: 'BUY',  pnl: +196.00 },
    { sym: 'EURUSD', type: 'BUY',  pnl: +44.80  },
  ]
  const calWins   = [3,5,9,12,16,17,19,21]
  const calLosses = [4,10,14,18]

  return (
    <>
      <style>{`
        @keyframes lp-click { 0%{transform:scale(0.2);opacity:1} 100%{transform:scale(2.6);opacity:0} }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', background: '#090D13', position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Animated cursor */}
        <div style={{
          position: 'absolute', left: cursorX, top: cursorY, zIndex: 60, pointerEvents: 'none',
          filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
          transition: [`left ${cursorEase}ms cubic-bezier(${cursorCubic})`, `top ${cursorEase}ms cubic-bezier(${cursorCubic})`].join(', '),
        }}>
          <svg width="11" height="15" viewBox="0 0 13 17" fill="none">
            <path d={CURSOR_PATH} fill="white" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round"/>
          </svg>
          {cursorClicking && (
            <div style={{ position: 'absolute', top: '-5px', left: '-5px', width: '21px', height: '21px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.9)', animation: 'lp-click 0.36s ease-out forwards' }} />
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogoMark size={14} />
            <span style={{ color: 'var(--t1)', fontSize: '10px', fontWeight: 700 }}>Velquor</span>
          </div>
          <div style={{ display: 'flex', gap: '1px' }}>
            {TAB_NAMES.map((name, i) => (
              <span key={name} data-lptab={i} style={{
                fontSize: '9px', padding: '2px 7px', borderRadius: '5px',
                color: i === activeTab ? 'var(--ac)' : 'var(--t3)',
                background: i === activeTab ? 'rgba(77,143,255,0.12)' : 'transparent',
                fontWeight: i === activeTab ? 600 : 400,
                transition: 'all 0.25s ease',
                borderBottom: i === activeTab ? '1px solid rgba(77,143,255,0.4)' : '1px solid transparent',
                whiteSpace: 'nowrap',
              }}>{name}</span>
            ))}
          </div>
          <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'linear-gradient(145deg,var(--ac),var(--pu))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white' }}>M</div>
        </div>

        {/* Content */}
        <div style={{ padding: '12px 14px 10px', minHeight: '210px', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(5px)', transition: 'opacity 0.25s ease, transform 0.25s ease' }}>

          {/* OVERVIEW */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--t3)', fontSize: '9px' }}>Good morning, Marco</p>
                <p style={{ margin: '2px 0 0', color: 'var(--t1)', fontSize: '12px', fontWeight: 700, letterSpacing: '-0.02em' }}>Your edge is working today.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                {[
                  { label: 'Today P&L', value: '+€408', color: 'var(--gr2)' },
                  { label: 'Win Rate',  value: '80%',   color: 'var(--ac)' },
                  { label: 'Balance',   value: '€12,408', color: 'var(--t1)' },
                  { label: 'Open',      value: '2',     color: 'var(--am2)' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '7px 8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</p>
                    <p style={{ margin: '2px 0 0', color: m.color, fontSize: '11px', fontWeight: 700 }}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ margin: '0 0 6px', color: 'var(--t2)', fontSize: '9px', fontWeight: 600 }}>Weekly P&L</p>
                  <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '36px', overflow: 'visible' }}>
                    <defs><linearGradient id="lp-g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--ac)" stopOpacity="0.25"/><stop offset="100%" stopColor="var(--ac)" stopOpacity="0"/></linearGradient></defs>
                    <path d={ap} fill="url(#lp-g1)"/>
                    <path d={lp} fill="none" stroke="var(--ac)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="2.5" fill="var(--ac)"/>
                  </svg>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <p style={{ margin: 0, padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t2)', fontSize: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Recent</p>
                  {trades.slice(0,3).map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '6px', padding: '1px 3px', borderRadius: '3px', fontWeight: 700, background: t.type==='BUY'?'rgba(0,255,133,0.1)':'rgba(255,51,71,0.1)', color: t.type==='BUY'?'var(--gr2)':'var(--re)' }}>{t.type}</span>
                        <span style={{ color: 'var(--t1)', fontSize: '9px' }}>{t.sym}</span>
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: t.pnl>=0?'var(--gr2)':'var(--re)' }}>{t.pnl>=0?'+':''}€{Math.abs(t.pnl).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TRADING */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '6px' }}>
                {[
                  { label: 'Total P&L',     value: '+€1,824', color: 'var(--gr2)' },
                  { label: 'Win Rate',      value: '67%',     color: 'var(--ac)' },
                  { label: 'Profit Factor', value: '2.14',    color: 'var(--am2)' },
                  { label: 'Avg Win',       value: '+€240',   color: 'var(--gr)' },
                  { label: 'Avg Loss',      value: '−€100',   color: 'var(--re)' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '7px 6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</p>
                    <p style={{ margin: '2px 0 0', color: m.color, fontSize: '10px', fontWeight: 700 }}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ margin: '0 0 6px', color: 'var(--t2)', fontSize: '9px', fontWeight: 600 }}>Equity Curve</p>
                <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '40px', overflow: 'visible' }}>
                  <defs><linearGradient id="lp-g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--gr2)" stopOpacity="0.2"/><stop offset="100%" stopColor="var(--gr2)" stopOpacity="0"/></linearGradient></defs>
                  <path d={ap} fill="url(#lp-g2)"/>
                  <path d={lp} fill="none" stroke="var(--gr2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="2.5" fill="var(--gr2)"/>
                </svg>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                {trades.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 36px 1fr 48px', padding: '5px 10px', borderBottom: i < trades.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center' }}>
                    <span style={{ color: 'var(--t1)', fontSize: '9px', fontWeight: 600 }}>{t.sym}</span>
                    <span style={{ fontSize: '6px', padding: '1px 3px', borderRadius: '3px', fontWeight: 700, width: 'fit-content', background: t.type==='BUY'?'rgba(0,255,133,0.1)':'rgba(255,51,71,0.1)', color: t.type==='BUY'?'var(--gr2)':'var(--re)' }}>{t.type}</span>
                    <span style={{ color: 'var(--t3)', fontSize: '8px' }}>ICT</span>
                    <span style={{ textAlign: 'right', fontSize: '9px', fontWeight: 700, color: t.pnl>=0?'var(--gr2)':'var(--re)' }}>{t.pnl>=0?'+':''}€{Math.abs(t.pnl).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JOURNAL */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ margin: '0 0 8px', color: 'var(--t2)', fontSize: '9px', fontWeight: 600 }}>June 2026</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '1px' }}>
                    {['M','T','W','T','F','S','S'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontSize: '6px', color: 'var(--t3)', fontWeight: 600, marginBottom: '2px' }}>{d}</div>
                    ))}
                    {[null,null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontSize: '7px', padding: '1px', borderRadius: '2px', color: d===21?'white':d?'var(--t2)':'transparent', background: d===21?'var(--ac)':d&&calWins.includes(d)?'rgba(0,255,133,0.18)':d&&calLosses.includes(d)?'rgba(255,51,71,0.15)':'transparent', fontWeight: d===21?700:400 }}>{d||''}</div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <p style={{ margin: 0, color: 'var(--t1)', fontSize: '10px', fontWeight: 600 }}>Today&apos;s Entry</p>
                    <span style={{ background: 'rgba(0,255,133,0.1)', color: 'var(--gr2)', fontSize: '7px', padding: '1px 6px', borderRadius: '20px', fontWeight: 600 }}>WIN</span>
                  </div>
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    {['London', 'ICT', 'Calm'].map(tag => (
                      <span key={tag} style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t2)', fontSize: '7px', padding: '1px 5px', borderRadius: '20px' }}>{tag}</span>
                    ))}
                  </div>
                  <p style={{ margin: '0 0 8px', color: 'var(--t2)', fontSize: '9px', lineHeight: 1.6 }}>Took 2 XAUUSD trades London. Both hit target. Waited for OB before entering.</p>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--t3)', fontSize: '7px' }}>Mood</span>
                    <span style={{ background: 'rgba(0,255,133,0.12)', color: 'var(--gr2)', fontSize: '8px', padding: '1px 6px', borderRadius: '20px' }}>😌 Confident</span>
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '20px' }}>
                {[{label:'Streak',value:'12 days',icon:'🔥'},{label:'Discipline',value:'87/100',icon:'✅'},{label:'Best',value:'19 days',icon:'🏆'}].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px' }}>{s.icon}</span>
                    <div>
                      <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px' }}>{s.label}</p>
                      <p style={{ margin: 0, color: 'var(--t1)', fontSize: '10px', fontWeight: 700 }}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VELQUOR AI */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <LogoMark size={20} />
                <div>
                  <div style={{ color: 'var(--t3)', fontSize: '8px', marginBottom: '4px' }}>VELQUOR AI</div>
                  <p style={{ margin: 0, color: 'var(--t2)', fontSize: '10px', lineHeight: 1.7 }}>
                    {AI_TEXT.slice(0, aiChars)}
                    <span style={{ opacity: aiChars < AI_TEXT.length ? 1 : 0, animation: aiChars < AI_TEXT.length ? 'lp-aurora-a 0.6s step-end infinite' : 'none', color: 'var(--ac)' }}>|</span>
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {[{label:'XAUUSD WR',value:'83%',color:'var(--gr2)'},{label:'NAS100 WR',value:'42%',color:'var(--re)'},{label:'EURUSD WR',value:'68%',color:'var(--ac)'}].map(m => (
                  <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px' }}>{m.label}</p>
                    <p style={{ margin: '2px 0 0', color: m.color, fontSize: '14px', fontWeight: 700 }}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: 'linear-gradient(135deg,rgba(77,143,255,0.06),rgba(168,126,255,0.06))', border: '1px solid rgba(77,143,255,0.15)', borderRadius: '6px', padding: '8px 12px' }}>
                <p style={{ margin: 0, color: 'var(--t2)', fontSize: '9px', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--ac)' }}>Insight:</strong> Avoid NAS100 in first 30 min after NY open — 6 of your 8 losses came from this window.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${progress}%`, background: 'linear-gradient(90deg,var(--go2),var(--ac))', transition: 'width 0.04s linear' }} />
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')

  // Sign-in state
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  // Sign-up extra
  const [displayName, setDisplayName] = useState('')
  const [signedUp,    setSignedUp]    = useState(false)
  const [resetSent,   setResetSent]   = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard')
    })
    // Pre-fill mode from URL param
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') setMode('signup')
  }, [router])

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authError) setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setSignedUp(false)
    setResetSent(false)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email)
      if (authError) setError(authError.message)
      else setResetSent(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) setError(authError.message)
      else router.replace('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || 'Trader' },
        },
      })
      if (authError) setError(authError.message)
      else setSignedUp(true)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--s2)',
    border: '1px solid var(--bd2)',
    borderRadius: '10px',
    padding: '12px 14px',
    color: 'var(--t1)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'var(--t2)',
    fontSize: '12px',
    marginBottom: '6px',
    fontWeight: 500,
  }

  const isDisabled = loading || !email || !password

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      fontFamily: 'inherit',
    }}>
      {/* ── Left panel — matches landing page hero ────────────────────── */}
      <div style={{
        display: 'none',
        width: '52%',
        flexShrink: 0,
        background: '#000',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }} className="login-left-panel">

        {/* Aurora bars */}
        <Aurora />

        {/* Deep space glows */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '100%', height: '60%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(55,90,180,0.20) 0%, rgba(30,50,120,0.07) 45%, transparent 70%)' }} />
          <div style={{ position: 'absolute', top: '25%', left: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(33,110,210,0.09) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', top: '20%', right: '-10%', width: '55%', height: '55%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(140,60,220,0.09) 0%, transparent 65%)' }} />
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '32px 36px 28px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '4px 10px 4px 6px' }}>
              <LogoMark size={20} />
              <span style={{ color: '#F2F2F2', fontWeight: 700, fontSize: '12.5px', letterSpacing: '0.02em' }}>VELQUOR</span>
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', paddingTop: '8px' }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', width: 'fit-content', background: 'rgba(77,143,255,0.1)', border: '1px solid rgba(77,143,255,0.22)' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4B8FFF', display: 'block', boxShadow: '0 0 6px #4B8FFF' }} />
              <span style={{ color: '#4B8FFF', fontSize: '11px', fontWeight: 500 }}>Built for serious MT5 traders</span>
            </div>

            {/* Headline */}
            <div>
              <h2 style={{ fontSize: 'clamp(28px,3.5vw,42px)', fontWeight: 900, lineHeight: 0.97, letterSpacing: '-0.04em', margin: '0 0 14px', color: '#fff' }}>
                See the truth.<br />
                <span style={{ color: 'rgba(255,255,255,0.28)' }}>Trade the edge.</span>
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: '340px' }}>
                Connect your MT5 account and instantly see what&apos;s working, what&apos;s not, and exactly where you&apos;re leaking money.
              </p>
            </div>

            {/* Dashboard preview */}
            <div style={{ position: 'relative' }}>
              {/* Glow behind preview */}
              <div aria-hidden style={{ position: 'absolute', inset: '-20px -30px', background: ['radial-gradient(ellipse at 20% 60%, rgba(33,110,243,0.22) 0%, transparent 55%)', 'radial-gradient(ellipse at 80% 60%, rgba(196,50,220,0.18) 0%, transparent 55%)'].join(', '), filter: 'blur(30px)', pointerEvents: 'none', zIndex: 0 }} />
              {/* Gradient border */}
              <div style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(90deg, #2196F3 0%, #7B2FBF 50%, #E040FB 100%)', padding: '1.5px', borderRadius: '12px', boxShadow: ['0 0 40px rgba(33,150,243,0.20)', '0 0 80px rgba(224,64,251,0.12)', '0 4px 30px rgba(33,100,200,0.16)'].join(', ') }}>
                <div style={{ background: '#090D13', borderRadius: '10px', overflow: 'hidden' }}>
                  <LoginDashboardPreview />
                </div>
              </div>
            </div>
          </div>

          {/* Trust bullets */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {['Any MT5 Broker', 'Live & Demo Accounts', 'AI-Powered', 'Free to start'].map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#00FF85', fontSize: '10px' }}>✓</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg)',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }}>

          {/* Back link */}
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            color: 'var(--t3)', fontSize: '12px', textDecoration: 'none',
            alignSelf: 'flex-start',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
          >
            ← Back to home
          </Link>

          {/* Logo + heading */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <LogoMark size={48} />
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ color: 'var(--t1)', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                Velquor
              </h1>
              <p style={{ color: 'var(--t3)', fontSize: '13px', marginTop: '4px' }}>
                {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
              </p>
            </div>
          </div>

          {/* Google OAuth — shown on signin/signup, not reset */}
          {!signedUp && mode !== 'reset' && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--s2)', border: '1px solid var(--bd2)',
                  borderRadius: '10px', cursor: loading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  color: 'var(--t1)', fontSize: '14px', fontWeight: 500,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--bd3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd2)')}
              >
                {/* Google G logo */}
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                <span style={{ color: 'var(--t3)', fontSize: '11px', flexShrink: 0 }}>or continue with email</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
              </div>
            </>
          )}

          {/* Success message after signup */}
          {signedUp ? (
            <div style={{
              padding: '20px',
              background: 'rgba(0,217,110,0.08)',
              border: '1px solid rgba(0,217,110,0.2)',
              borderRadius: '12px',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <span style={{ fontSize: '24px' }}>✉️</span>
              <p style={{ color: 'var(--gr2)', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                Check your email
              </p>
              <p style={{ color: 'var(--t2)', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                We sent a confirmation link to <strong style={{ color: 'var(--t1)' }}>{email}</strong>. Click it to activate your account.
              </p>
              <button
                onClick={() => switchMode('signin')}
                style={{
                  marginTop: '8px', background: 'none', border: 'none',
                  color: 'var(--ac)', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Sign-in form */}
              {mode === 'signin' && (
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
                    />
                  </div>

                  {error && (
                    <p style={{
                      color: 'var(--re)', fontSize: '13px',
                      background: 'rgba(255,51,71,0.08)',
                      border: '1px solid rgba(255,51,71,0.2)',
                      borderRadius: '8px', padding: '10px 12px', margin: 0,
                    }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isDisabled}
                    style={{
                      width: '100%', padding: '13px',
                      background: isDisabled ? 'var(--s2)' : 'var(--ac)',
                      border: 'none', borderRadius: '10px',
                      color: isDisabled ? 'var(--t3)' : 'white',
                      fontSize: '14px', fontWeight: 600,
                      cursor: isDisabled ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      marginTop: '4px',
                    }}
                  >
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
              )}

              {/* Sign-up form */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Trader"
                      autoComplete="name"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
                    />
                  </div>

                  {error && (
                    <p style={{
                      color: 'var(--re)', fontSize: '13px',
                      background: 'rgba(255,51,71,0.08)',
                      border: '1px solid rgba(255,51,71,0.2)',
                      borderRadius: '8px', padding: '10px 12px', margin: 0,
                    }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isDisabled}
                    style={{
                      width: '100%', padding: '13px',
                      background: isDisabled ? 'var(--s2)' : 'var(--ac)',
                      border: 'none', borderRadius: '10px',
                      color: isDisabled ? 'var(--t3)' : 'white',
                      fontSize: '14px', fontWeight: 600,
                      cursor: isDisabled ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      marginTop: '4px',
                    }}
                  >
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </form>
              )}

              {/* Reset password form */}
              {mode === 'reset' && (
                resetSent ? (
                  <div style={{
                    padding: '20px',
                    background: 'rgba(0,217,110,0.08)',
                    border: '1px solid rgba(0,217,110,0.2)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                  }}>
                    <span style={{ fontSize: '24px' }}>✉️</span>
                    <p style={{ color: 'var(--gr2)', fontSize: '14px', fontWeight: 600, margin: 0 }}>Check your email</p>
                    <p style={{ color: 'var(--t2)', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                      Password reset link sent to <strong style={{ color: 'var(--t1)' }}>{email}</strong>.
                    </p>
                    <button onClick={() => switchMode('signin')} style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--ac)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ color: 'var(--t2)', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                      Enter your email and we&apos;ll send you a reset link.
                    </p>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                        onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
                      />
                    </div>
                    {error && (
                      <p style={{ color: 'var(--re)', fontSize: '13px', background: 'rgba(255,51,71,0.08)', border: '1px solid rgba(255,51,71,0.2)', borderRadius: '8px', padding: '10px 12px', margin: 0 }}>
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !email}
                      style={{
                        width: '100%', padding: '13px',
                        background: loading || !email ? 'var(--s2)' : 'var(--ac)',
                        border: 'none', borderRadius: '10px',
                        color: loading || !email ? 'var(--t3)' : 'white',
                        fontSize: '14px', fontWeight: 600,
                        cursor: loading || !email ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {loading ? 'Sending…' : 'Send reset link'}
                    </button>
                    <button onClick={() => switchMode('signin')} type="button" style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '13px', cursor: 'pointer' }}>
                      Back to sign in
                    </button>
                  </form>
                )
              )}

              {/* Toggle mode */}
              {mode !== 'reset' && (
              <p style={{ textAlign: 'center', color: 'var(--t3)', fontSize: '13px', margin: 0 }}>
                {mode === 'signin' ? (
                  <>Don&apos;t have an account?{' '}
                    <button
                      onClick={() => switchMode('signup')}
                      style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button
                      onClick={() => switchMode('signin')}
                      style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Inline responsive styles for left panel */}
      <style>{`
        @media (min-width: 768px) {
          .login-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
