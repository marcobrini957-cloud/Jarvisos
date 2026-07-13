'use client'

import { useState } from 'react'
import Panel from '@/components/ui/Panel'

// ── Position Size Calculator ───────────────────────────────────────────────────

export function PositionSizeCalc() {
  const [instrument, setInstrument] = useState<'XAUUSD' | 'NAS100'>('XAUUSD')
  const [balance,    setBalance]    = useState('10000')
  const [riskMode,   setRiskMode]   = useState<'pct' | 'eur'>('pct')
  const [riskPct,    setRiskPct]    = useState('1')
  const [riskEurAmt, setRiskEurAmt] = useState('100')
  const [entry,      setEntry]      = useState('')
  const [sl,         setSl]         = useState('')

  // USD contract value per 1 standard lot per 1.0 price move
  // XAUUSD: 100 oz × $1/oz = $100/lot/pt
  // NAS100: $1/lot/pt (standard micro-like contract on MT5)
  const CONTRACT: Record<'XAUUSD' | 'NAS100', number> = { XAUUSD: 100, NAS100: 1 }
  const EURUSD = 1.085  // approximate; affects lot size slightly

  const bal     = parseFloat(balance)    || 0
  const entryV  = parseFloat(entry)      || 0
  const slV     = parseFloat(sl)         || 0
  const dist    = Math.abs(entryV - slV)

  const riskEur = riskMode === 'pct'
    ? bal * ((parseFloat(riskPct) || 0) / 100)
    : parseFloat(riskEurAmt) || 0

  const contractVal = CONTRACT[instrument]
  const lots        = dist > 0 ? (riskEur * EURUSD) / (dist * contractVal) : 0
  const lotsOut     = Math.max(0.01, Math.floor(lots * 100) / 100)
  const actualRiskE = dist > 0 ? (lotsOut * dist * contractVal) / EURUSD : 0

  const inputSt: React.CSSProperties = {
    background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '8px',
    padding: '8px 12px', color: 'var(--t1)', fontSize: '14px',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const focus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--ac)')
  const blur  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = 'var(--bd2)')

  return (
    <Panel title="Position Size Calculator" accent="var(--go2)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Instrument */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['XAUUSD', 'NAS100'] as const).map(inst => (
            <button key={inst} onClick={() => setInstrument(inst)} style={{
              flex: 1, padding: '7px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: instrument === inst ? 'var(--ac)' : 'var(--s3)',
              color:      instrument === inst ? 'white'     : 'var(--t2)',
              fontSize: '12px', fontWeight: 600, transition: 'all 0.12s',
            }}>
              {inst}
            </button>
          ))}
        </div>

        {/* Balance + Risk */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ color: 'var(--t3)', fontSize: '11px', display: 'block', marginBottom: '5px' }}>Balance (€)</label>
            <input value={balance} onChange={e => setBalance(e.target.value)}
              style={inputSt} onFocus={focus} onBlur={blur} placeholder="10000" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <label style={{ color: 'var(--t3)', fontSize: '11px' }}>Risk</label>
              <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--bd2)' }}>
                {(['pct', 'eur'] as const).map(m => (
                  <button key={m} onClick={() => setRiskMode(m)} style={{
                    padding: '2px 8px', border: 'none', cursor: 'pointer', fontSize: '10px',
                    background: riskMode === m ? 'var(--ac)' : 'transparent',
                    color:      riskMode === m ? 'white'     : 'var(--t3)',
                  }}>
                    {m === 'pct' ? '%' : '€'}
                  </button>
                ))}
              </div>
            </div>
            {riskMode === 'pct' ? (
              <input value={riskPct} onChange={e => setRiskPct(e.target.value)}
                style={inputSt} onFocus={focus} onBlur={blur} placeholder="1.0" />
            ) : (
              <input value={riskEurAmt} onChange={e => setRiskEurAmt(e.target.value)}
                style={inputSt} onFocus={focus} onBlur={blur} placeholder="100" />
            )}
          </div>
        </div>

        {/* Entry + SL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ color: 'var(--t3)', fontSize: '11px', display: 'block', marginBottom: '5px' }}>Entry Price</label>
            <input value={entry} onChange={e => setEntry(e.target.value)}
              style={inputSt} onFocus={focus} onBlur={blur}
              placeholder={instrument === 'XAUUSD' ? '2350.00' : '19000'} />
          </div>
          <div>
            <label style={{ color: 'var(--t3)', fontSize: '11px', display: 'block', marginBottom: '5px' }}>Stop Loss</label>
            <input value={sl} onChange={e => setSl(e.target.value)}
              style={inputSt} onFocus={focus} onBlur={blur}
              placeholder={instrument === 'XAUUSD' ? '2340.00' : '18950'} />
          </div>
        </div>

        {/* Result */}
        {dist > 0 ? (
          <div style={{
            padding: '16px 18px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(255,176,48,0.09) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,176,48,0.22)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
              <span style={{ color: 'var(--t3)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lot Size</span>
              <span style={{ color: 'var(--go2)', fontSize: '34px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {lotsOut.toFixed(2)}
              </span>
              <span style={{ color: 'var(--t3)', fontSize: '13px' }}>lots</span>
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '2px', letterSpacing: '0.04em' }}>RISK AT SIZE</p>
                <p style={{ color: 'var(--re)', fontSize: '13px', fontWeight: 600 }}>−€{actualRiskE.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '2px', letterSpacing: '0.04em' }}>SL DISTANCE</p>
                <p style={{ color: 'var(--t2)', fontSize: '13px', fontWeight: 600 }}>
                  {dist.toFixed(instrument === 'XAUUSD' ? 2 : 0)} pts
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '2px', letterSpacing: '0.04em' }}>% OF BALANCE</p>
                <p style={{ color: bal > 0 && actualRiskE / bal > 0.02 ? 'var(--am2)' : 'var(--t2)', fontSize: '13px', fontWeight: 600 }}>
                  {bal > 0 ? ((actualRiskE / bal) * 100).toFixed(2) : '—'}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '14px', borderRadius: '8px', textAlign: 'center',
            background: 'var(--s2)', border: '1px dashed var(--bd2)',
          }}>
            <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Enter entry & stop loss to calculate lot size</p>
          </div>
        )}

        <p style={{ color: 'var(--t3)', fontSize: '10px', lineHeight: 1.5 }}>
          Approx. EURUSD 1.085 · XAUUSD $100/lot/pt · NAS100 $1/lot/pt
        </p>
      </div>
    </Panel>
  )
}
