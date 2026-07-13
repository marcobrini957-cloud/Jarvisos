'use client'

import { useState, useEffect, useRef } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'

const CURSOR_PATH = "M1 1 L1 13.5 L4.2 10.2 L6.5 16.5 L8.8 15.5 L6.5 9.2 L11.5 9.2 Z"

export function LoginDashboardPreview() {
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

