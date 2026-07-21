'use client'

import { useState, useRef } from 'react'

// ── CSV Import ────────────────────────────────────────────────────────────────

export interface CsvRow {
  ticker:        string
  name:          string
  quantity:      number
  avg_buy_price: number
  asset_type:    string
  skip:          boolean
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.trim().split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if ((ch === ',' || ch === ';') && !inQ) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim())
    rows.push(cells)
  }
  return rows
}

// Handles both US "1,234.56" and European "1.234,56" / "482,20" formats
export function parseNum(raw: string): number {
  const s = raw.trim().replace(/[€$£\s+%]/g, '')
  if (!s) return NaN
  const hasComma = s.includes(',')
  const hasDot   = s.includes('.')
  if (hasComma && hasDot) {
    // Determine which is decimal separator by which comes last
    return s.lastIndexOf(',') > s.lastIndexOf('.')
      ? parseFloat(s.replace(/\./g, '').replace(',', '.'))  // European: "1.234,56"
      : parseFloat(s.replace(/,/g, ''))                     // US: "1,234.56"
  }
  if (hasComma) {
    // Only comma — decimal if ≤2 digits after it ("482,20"), thousands otherwise ("1,234")
    const after = s.split(',')[1] ?? ''
    return after.length <= 2
      ? parseFloat(s.replace(',', '.'))
      : parseFloat(s.replace(',', ''))
  }
  return parseFloat(s)
}

export function detectColumns(headers: string[]) {
  const h = headers.map(x => x.toLowerCase().replace(/[^a-z0-9]/g, ''))
  // Find first column whose normalized header includes any keyword
  const find = (...keys: string[]) => h.findIndex(x => keys.some(k => x.includes(k)))
  // Try specific keys first, fall back to generic
  const findBest = (specific: string[], generic: string[]) => {
    const s = find(...specific); return s >= 0 ? s : find(...generic)
  }
  return {
    ticker: find('isin','wkn','ticker','symbol'),
    name:   find('name','bezeichnung','wertpapier','security'),
    qty:    find('anzahl','quantity','shares','units','stueck','menge','antal','amount'),
    // Prioritise avg-buy-price columns; only fall back to generic "price/kurs" if nothing else found
    price:  findBest(
      ['avgprice','averageprice','avgcost','averagecost','averagebuyprice','buyprice',
       'kaufpreis','einstandspreis','openrate','openavg','purchaseprice','costprice'],
      ['price','preis','kurs','cost','rate','koers']
    ),
  }
}

export function guessAssetType(name: string, ticker: string): string {
  const n = (name + ticker).toLowerCase()
  if (n.includes('etf') || n.includes('fund') || n.includes('iqq') || n.includes('vang') || n.includes('ishares')) return 'etf'
  if (n.includes('bitcoin') || n.includes('eth') || n.includes('crypto') || n.includes('btc')) return 'crypto'
  if (n.includes('gold') || n.includes('silver') || n.includes('xau') || n.includes('xag')) return 'metal'
  return 'stock'
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/

export function CsvImportModal({ onClose, onImport, mode = 'add', existingTickers }: {
  onClose:  () => void
  onImport: (rows: CsvRow[]) => Promise<void>
  mode?:    'add' | 'update'
  /** Normalised (UPPERCASE) tickers already in the portfolio — drives New/Update badges. */
  existingTickers?: Set<string>
}) {
  const isUpdate = mode === 'update'
  const isExisting = (t: string) => !!existingTickers?.has(t.trim().toUpperCase())
  const [step,      setStep]      = useState<'upload' | 'preview'>('upload')
  const [rows,      setRows]      = useState<CsvRow[]>([])
  const [resolving, setResolving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error,     setError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const text    = ev.target?.result as string
        const all     = parseCSV(text)
        if (all.length < 2) { setError('CSV appears empty or has no data rows.'); return }

        const headers = all[0]
        const cols    = detectColumns(headers)

        if (cols.qty < 0 || cols.price < 0) {
          setError(`Couldn't find quantity or price columns. Headers found: ${headers.join(', ')}`)
          return
        }

        const parsed: CsvRow[] = []
        for (let i = 1; i < all.length; i++) {
          const r      = all[i]
          const cell   = (idx: number) => idx >= 0 ? (r[idx] ?? '').trim() : ''
          const ticker = cell(cols.ticker).toUpperCase()
          const name   = cell(cols.name) || ticker
          const qty    = parseNum(cell(cols.qty))
          const price  = parseNum(cell(cols.price))
          if (!ticker || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) continue
          parsed.push({
            ticker, name: name || ticker,
            quantity: qty, avg_buy_price: price,
            asset_type: guessAssetType(name, ticker),
            skip: false,
          })
        }

        if (parsed.length === 0) {
          setError(`No valid rows found. Detected columns — ticker:${cols.ticker} name:${cols.name} qty:${cols.qty} price:${cols.price}. Headers: ${headers.join(' | ')}`)
          return
        }

        // ── Resolve any ISINs to real ticker symbols ──────────────────────────
        const isinRows = parsed.filter(r => ISIN_RE.test(r.ticker))
        if (isinRows.length > 0) {
          setResolving(true)
          try {
            const res  = await fetch('/api/portfolio/isin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isins: isinRows.map(r => r.ticker) }),
            })
            const { results } = await res.json() as { results: Record<string, { ticker: string; name: string } | null> }
            for (const row of parsed) {
              const isin = row.ticker  // save original ISIN before overwriting
              if (ISIN_RE.test(isin) && results[isin]) {
                const resolved = results[isin]!
                // Replace name if it looks like an ISIN or is empty
                if (ISIN_RE.test(row.name) || !row.name) {
                  row.name = resolved.name
                }
                row.ticker     = resolved.ticker
                row.asset_type = guessAssetType(resolved.name, resolved.ticker)
              }
            }
          } catch { /* silently ignore — user can fix manually */ }
          setResolving(false)
        }

        setRows(parsed)
        setStep('preview')
      } catch {
        setError('Failed to parse CSV. Make sure it is a valid CSV file.')
        setResolving(false)
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    const toImport = rows.filter(r => !r.skip)
    if (toImport.length === 0) return
    setImporting(true)
    try {
      await onImport(toImport)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
      setImporting(false)
    }
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  }
  const card: React.CSSProperties = {
    background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: '16px',
    width: '100%', maxWidth: '620px', maxHeight: '80vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={card}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--bd)' }}>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--t1)', fontSize: '15px' }}>
              {step === 'upload'
                ? (isUpdate ? 'Update Portfolio from CSV' : 'Import Portfolio CSV')
                : `Preview — ${rows.filter(r => !r.skip).length} holdings`}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
              {step === 'upload'
                ? (isUpdate ? 'Refreshes matching holdings · adds only new tickers · never duplicates' : 'Trade Republic · eToro · Degiro · any broker export')
                : (isUpdate ? 'Uncheck any row you don\'t want to apply' : 'Uncheck rows you don\'t want to import')}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {step === 'upload' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--bd2)', borderRadius: '12px',
                  padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--ac)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd2)')}
              >
                <p style={{ fontSize: '32px', marginBottom: '10px' }}>📂</p>
                <p style={{ color: 'var(--t1)', fontWeight: 600, marginBottom: '4px' }}>Click to select your CSV file</p>
                <p style={{ color: 'var(--t3)', fontSize: '12px' }}>or drag and drop</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
              </div>

              {/* Supported formats */}
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '14px', border: '1px solid var(--bd)' }}>
                <p style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>How to export your CSV</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {[
                    ['Trade Republic', 'Portfolio → Share → Export as CSV'],
                    ['eToro',          'Portfolio → History → Download Statement'],
                    ['Degiro',         'Portfolio → Export → CSV'],
                    ['IBKR',           'Reports → Activity → Holdings → CSV'],
                    ['Other',          'Any CSV with columns: ticker/symbol, shares/qty, avg price'],
                  ].map(([broker, instruction]) => (
                    <div key={broker} style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--t2)', fontWeight: 600, minWidth: '100px' }}>{broker}</span>
                      <span style={{ color: 'var(--t3)' }}>{instruction}</span>
                    </div>
                  ))}
                </div>
              </div>

              {resolving && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(77,143,255,0.08)', borderRadius: '8px', border: '1px solid rgba(77,143,255,0.2)' }}>
                  <span style={{ fontSize: '14px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                  <p style={{ color: 'var(--ac)', fontSize: '12px' }}>Resolving ISIN codes to ticker symbols…</p>
                </div>
              )}

              {error && <p style={{ color: 'var(--re)', fontSize: '12px', padding: '10px 12px', background: 'rgba(255,61,80,0.08)', borderRadius: '8px', border: '1px solid rgba(255,61,80,0.2)' }}>{error}</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 80px 80px 80px', gap: '8px', padding: '6px 8px', fontSize: '10px', color: 'var(--t3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                <span />
                <span>Ticker</span>
                <span>Name</span>
                <span>Qty</span>
                <span>Avg Price</span>
                <span>Type</span>
              </div>

              {rows.some(r => !r.skip && ISIN_RE.test(r.ticker)) && (
                <div style={{ padding: '10px 12px', background: 'rgba(240,168,64,0.08)', borderRadius: '8px', border: '1px solid rgba(240,168,64,0.2)', fontSize: '12px', color: 'var(--am2)' }}>
                  ⚠ Some tickers couldn't be resolved from their ISIN. Edit them manually in the Ticker column before importing.
                </div>
              )}

              {rows.map((row, i) => {
                const needsFix = ISIN_RE.test(row.ticker)
                return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '32px 1fr 1fr 80px 80px 80px',
                  gap: '8px', alignItems: 'center', padding: '10px 8px',
                  background: row.skip ? 'transparent' : needsFix ? 'rgba(240,168,64,0.05)' : 'rgba(255,255,255,0.025)',
                  borderRadius: '8px', border: `1px solid ${needsFix && !row.skip ? 'rgba(240,168,64,0.3)' : 'var(--bd)'}`,
                  opacity: row.skip ? 0.35 : 1, transition: 'all 0.1s',
                }}>
                  <input type="checkbox" checked={!row.skip}
                    onChange={() => setRows(prev => prev.map((r, j) => j === i ? { ...r, skip: !r.skip } : r))}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--ac)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                    {isUpdate && (
                      isExisting(row.ticker)
                        ? <span style={{ alignSelf: 'flex-start', fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--ac)', background: 'rgba(77,143,255,0.14)', border: '1px solid rgba(77,143,255,0.3)', borderRadius: '4px', padding: '1px 5px' }}>UPDATE</span>
                        : <span style={{ alignSelf: 'flex-start', fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--gr2)', background: 'rgba(52,199,89,0.14)', border: '1px solid rgba(52,199,89,0.3)', borderRadius: '4px', padding: '1px 5px' }}>NEW</span>
                    )}
                    <input value={row.ticker}
                      onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, ticker: e.target.value.toUpperCase() } : r))}
                      style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '5px 8px', color: 'var(--t1)', fontSize: '12px', fontWeight: 600, width: '100%' }} />
                  </div>
                  <input value={row.name}
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '5px 8px', color: 'var(--t2)', fontSize: '12px', width: '100%' }} />
                  <input value={row.quantity} type="number"
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, quantity: parseFloat(e.target.value) || 0 } : r))}
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '5px 8px', color: 'var(--t1)', fontSize: '12px', width: '100%' }} />
                  <input value={row.avg_buy_price} type="number"
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, avg_buy_price: parseFloat(e.target.value) || 0 } : r))}
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '5px 8px', color: 'var(--t1)', fontSize: '12px', width: '100%' }} />
                  <select value={row.asset_type}
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, asset_type: e.target.value } : r))}
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '5px 6px', color: 'var(--t2)', fontSize: '11px', width: '100%' }}>
                    <option value="stock">Stock</option>
                    <option value="etf">ETF</option>
                    <option value="crypto">Crypto</option>
                    <option value="metal">Metal</option>
                  </select>
                </div>
              )})}

              {error && <p style={{ color: 'var(--re)', fontSize: '12px', padding: '10px 12px', background: 'rgba(255,61,80,0.08)', borderRadius: '8px', border: '1px solid rgba(255,61,80,0.2)' }}>{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--bd)', display: 'flex', gap: '10px' }}>
            <button onClick={() => { setStep('upload'); setRows([]); setError('') }}
              style={{ flex: 1, padding: '10px', background: 'var(--s3)', border: '1px solid var(--bd2)', borderRadius: '8px', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>
              ← Back
            </button>
            {(() => {
              const active   = rows.filter(r => !r.skip)
              const newCount = active.filter(r => !isExisting(r.ticker)).length
              const updCount = active.length - newCount
              const label = importing
                ? (isUpdate ? 'Updating…' : 'Importing…')
                : isUpdate
                  ? `Update — ${newCount} new, ${updCount} updated`
                  : `Import ${active.length} holding${active.length !== 1 ? 's' : ''}`
              return (
                <button onClick={handleImport} disabled={importing || active.length === 0}
                  style={{ flex: 2, padding: '10px', background: 'var(--gr)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.7 : 1 }}>
                  {label}
                </button>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
