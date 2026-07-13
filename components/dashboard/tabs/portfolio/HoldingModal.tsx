'use client'

import { useState, useEffect } from 'react'
import { usePortfolio, type HoldingWithPrice } from '@/hooks/usePortfolio'
import { TROY_OZ_TO_GRAMS, METAL_OPTIONS } from './helpers'
import { TickerSearch } from './TickerSearch'

// ── Add / Edit Holding Modal ──────────────────────────────────────────────────

export type SaveData = Parameters<ReturnType<typeof usePortfolio>['addHolding']>[0]

export function HoldingModal({
  existing,
  onSave,
  onClose,
}: {
  existing?: HoldingWithPrice
  onSave:    (data: SaveData) => Promise<unknown>
  onClose:   () => void
}) {
  const [assetType,    setAsset]    = useState(existing?.asset_type ?? 'stock')
  // Stock/ETF/Crypto fields
  const [ticker,       setTicker]   = useState(existing?.ticker    ?? '')
  const [name,         setName]     = useState(existing?.name      ?? '')
  const [qty,          setQty]      = useState(String(existing?.quantity      ?? ''))
  const [avgPrice,     setAvgPrice] = useState(String(existing?.avg_buy_price ?? ''))
  const [sector,       setSector]   = useState(existing?.sector    ?? '')
  // Metal fields
  const [metalTicker,  setMetalTicker] = useState(
    existing?.asset_type === 'metal' ? (existing.ticker ?? 'GC=F') : 'GC=F'
  )
  const [metalGrams,   setMetalGrams]  = useState(
    existing?.asset_type === 'metal' ? String(existing.quantity ?? '') : ''
  )
  const [metalBuyPrice, setMetalBuyPrice] = useState(
    existing?.asset_type === 'metal' ? String(existing.avg_buy_price ?? '') : ''
  )
  const [spotPerGram,  setSpotPerGram]  = useState<number | null>(null)
  const [spotLoading,  setSpotLoading]  = useState(false)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const isMetal = assetType === 'metal'

  // Fetch live spot prices from dedicated metals API
  useEffect(() => {
    if (!isMetal) return
    setSpotLoading(true)
    setSpotPerGram(null)
    fetch('/api/metals/prices')
      .then(r => r.json())
      .then(data => {
        const mp = data[metalTicker]
        if (mp?.priceEurPerGram) setSpotPerGram(mp.priceEurPerGram)
      })
      .catch(() => {/* silently ignore */})
      .finally(() => setSpotLoading(false))
  }, [isMetal, metalTicker])

  async function handleSave() {
    setSaving(true); setError('')
    try {
      if (isMetal) {
        const g = parseFloat(metalGrams)
        const p = parseFloat(metalBuyPrice)
        if (!metalGrams || isNaN(g) || g <= 0) { setError('Enter a valid weight in grams.'); return }
        if (!metalBuyPrice || isNaN(p) || p <= 0) { setError('Enter a valid buy price per gram.'); return }
        await onSave({
          ticker:        metalTicker,
          name:          METAL_OPTIONS[metalTicker]?.label ?? metalTicker,
          asset_type:    'metal',
          quantity:      g,
          avg_buy_price: p,
          currency:      'EUR',
        })
      } else {
        if (!ticker.trim() || !qty || !avgPrice) {
          setError('Ticker, quantity and avg price are required.')
          return
        }
        await onSave({
          ticker:        ticker.trim().toUpperCase(),
          name:          name.trim() || ticker.trim().toUpperCase(),
          asset_type:    assetType,
          quantity:      parseFloat(qty),
          avg_buy_price: parseFloat(avgPrice),
          currency:      'EUR',
          sector:        sector || undefined,
        })
      }
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)',
    borderRadius: '8px', padding: '10px 12px', color: 'var(--t1)', fontSize: '13px', outline: 'none',
  }
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.target.style.borderColor = 'var(--ac)')
  const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.target.style.borderColor = 'var(--bd2)')

  const metalMeta = METAL_OPTIONS[metalTicker]
  const gramsNum  = parseFloat(metalGrams)
  const buyNum    = parseFloat(metalBuyPrice)
  const costPreview = !isNaN(gramsNum) && !isNaN(buyNum) && gramsNum > 0 && buyNum > 0
    ? gramsNum * buyNum : null
  const currentValue = spotPerGram !== null && !isNaN(gramsNum) && gramsNum > 0
    ? gramsNum * spotPerGram : null
  const unrealisedPnl = costPreview !== null && currentValue !== null ? currentValue - costPreview : null

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed z-50 rounded-xl flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '460px', maxWidth: 'calc(100vw - 32px)',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '24px',
          overflowY: 'auto', maxHeight: '90vh',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 500 }}>
              {existing ? 'Edit Holding' : 'Add Holding'}
            </h2>
            <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '2px' }}>
              {isMetal ? 'Live spot prices via Yahoo Finance · price in EUR/gram' : 'Prices update automatically from Yahoo Finance'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Asset type selector */}
        <div className="flex flex-col gap-1.5">
          <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Type</label>
          <div className="flex gap-2 flex-wrap">
            {(['stock', 'etf', 'crypto', 'metal', 'cash'] as const).map(t => (
              <button key={t} onClick={() => setAsset(t)}
                className="px-3 py-1.5 rounded-md"
                style={{
                  border: `1px solid ${assetType === t ? (t === 'metal' ? 'var(--go2)' : 'var(--ac)') : 'var(--bd2)'}`,
                  background: assetType === t ? (t === 'metal' ? 'rgba(210,153,34,0.12)' : 'rgba(88,166,255,0.1)') : 'var(--s2)',
                  color: assetType === t ? (t === 'metal' ? 'var(--go2)' : 'var(--ac)') : 'var(--t2)',
                  fontSize: '12px', cursor: 'pointer', fontWeight: assetType === t ? 600 : 400,
                  textTransform: 'capitalize',
                }}>
                {t === 'metal' ? 'Physical Metal' : t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Metal fields ── */}
        {isMetal && (
          <>
            {/* Metal selector */}
            <div className="flex flex-col gap-1.5">
              <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Metal</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(METAL_OPTIONS).map(([k, v]) => (
                  <button key={k} onClick={() => setMetalTicker(k)}
                    className="py-3 rounded-lg flex flex-col items-center gap-1"
                    style={{
                      border: `1px solid ${metalTicker === k ? v.color : 'var(--bd2)'}`,
                      background: metalTicker === k ? `color-mix(in srgb, ${v.color} 12%, transparent)` : 'var(--s2)',
                      cursor: 'pointer',
                    }}>
                    <span style={{ color: metalTicker === k ? v.color : 'var(--t2)', fontSize: '14px', fontWeight: 700 }}>{v.symbol}</span>
                    <span style={{ color: metalTicker === k ? v.color : 'var(--t3)', fontSize: '10px' }}>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live spot price box */}
            <div className="rounded-lg p-3" style={{ background: 'var(--s2)', border: `1px solid ${metalMeta?.color ?? 'var(--bd2)'}40` }}>
              {spotLoading ? (
                <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Fetching live spot price…</p>
              ) : spotPerGram !== null ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ color: 'var(--t3)', fontSize: '11px' }}>Today&apos;s spot price ({metalMeta?.label})</p>
                    <p style={{ color: metalMeta?.color ?? 'var(--go2)', fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                      €{spotPerGram.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span style={{ fontSize: '11px', fontWeight: 400, marginLeft: '3px' }}>/gram</span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'var(--t3)', fontSize: '10px' }}>Per troy oz</p>
                    <p style={{ color: 'var(--t2)', fontSize: '13px', fontWeight: 500 }}>
                      €{(spotPerGram * TROY_OZ_TO_GRAMS).toLocaleString('de-AT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Could not load spot price — check connection.</p>
              )}
            </div>

            {/* Grams + buy price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Weight (grams)</label>
                <input type="number" value={metalGrams} onChange={e => setMetalGrams(e.target.value)}
                  placeholder="31.10" min="0" step="any" style={inp} onFocus={focus} onBlur={blur} />
                <p style={{ color: 'var(--t3)', fontSize: '10px' }}>1 troy oz = {TROY_OZ_TO_GRAMS}g</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Buy Price (€/gram)</label>
                <input type="number" value={metalBuyPrice} onChange={e => setMetalBuyPrice(e.target.value)}
                  placeholder="75.00" min="0" step="any" style={inp} onFocus={focus} onBlur={blur} />
                <p style={{ color: 'var(--t3)', fontSize: '10px' }}>What you paid per gram in EUR</p>
              </div>
            </div>

            {/* P&L preview */}
            {costPreview !== null && (
              <div className="rounded-lg p-3 grid grid-cols-3 gap-3" style={{ background: 'var(--s2)', border: '1px solid var(--bd2)' }}>
                <div>
                  <p style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>Cost basis</p>
                  <p style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>
                    €{costPreview.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                {currentValue !== null && (
                  <div>
                    <p style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>Current value</p>
                    <p style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>
                      €{currentValue.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {unrealisedPnl !== null && (
                  <div>
                    <p style={{ color: 'var(--t3)', fontSize: '10px', marginBottom: '3px' }}>Unrealised P&L</p>
                    <p style={{ color: unrealisedPnl >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '13px', fontWeight: 700 }}>
                      {unrealisedPnl >= 0 ? '+' : ''}€{Math.abs(unrealisedPnl).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span style={{ fontSize: '10px', marginLeft: '3px' }}>
                        ({costPreview > 0 ? ((unrealisedPnl / costPreview) * 100).toFixed(1) : '0'}%)
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Stock / ETF / Crypto / Cash fields ── */}
        {!isMetal && (
          <>
            <TickerSearch
              value={ticker}
              displayName={name}
              onSelect={(t, n) => { setTicker(t); setName(n) }}
              inp={inp}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Number of Shares</label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)}
                  placeholder="14" min="0" step="any" style={inp} onFocus={focus} onBlur={blur} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Avg Buy Price (€)</label>
                <input type="number" value={avgPrice} onChange={e => setAvgPrice(e.target.value)}
                  placeholder="482.20" min="0" step="any" style={inp} onFocus={focus} onBlur={blur} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>Sector (optional)</label>
              <input value={sector} onChange={e => setSector(e.target.value)}
                placeholder="Technology, Clean Energy, Diversified…" style={inp} onFocus={focus} onBlur={blur} />
            </div>
            {(() => {
              const invested = parseFloat(qty) * parseFloat(avgPrice)
              if (isNaN(invested) || invested <= 0) return null
              return (
                <div className="rounded-lg p-3" style={{ background: 'var(--s2)', border: '1px solid var(--bd2)' }}>
                  <p style={{ color: 'var(--t3)', fontSize: '11px', marginBottom: '4px' }}>Cost basis preview</p>
                  <p style={{ color: 'var(--go2)', fontSize: '15px', fontWeight: 500 }}>
                    €{invested.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '2px' }}>
                    {parseFloat(qty)} shares × €{parseFloat(avgPrice).toFixed(2)} avg
                  </p>
                </div>
              )
            })()}
          </>
        )}

        {error && (
          <p style={{ color: 'var(--re)', fontSize: '12px', background: 'rgba(226,75,74,0.08)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(226,75,74,0.2)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-md"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-md font-medium"
            style={{
              background: saving ? 'rgba(88,166,255,0.3)' : (isMetal ? (metalMeta?.color ?? 'var(--go2)') : 'var(--ac)'),
              border: 'none', color: 'white', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer',
            }}>
            {saving ? 'Saving…' : existing ? 'Update Holding' : 'Add Holding'}
          </button>
        </div>
      </div>
    </>
  )
}
