'use client'

import { useEffect, useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'
import { useLocale } from '@/hooks/useLocale'

export function BeforeAfterMockup() {
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
            background: '#090D13', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%',
            width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 700,
          }}>→</div>
        </div>
        {/* Horizontal divider (mobile) */}
        <div className="ba-divider-h" style={{ display: 'none', height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 16px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#090D13', padding: '2px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700 }}>→</span>
        </div>

        {/* ── AFTER panel ── */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

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

