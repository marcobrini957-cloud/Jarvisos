'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePortfolio, type HoldingWithPrice } from '@/hooks/usePortfolio'
import MetricCard from '@/components/ui/MetricCard'
import Panel from '@/components/ui/Panel'

// ── CSV Import ────────────────────────────────────────────────────────────────

interface CsvRow {
  ticker:        string
  name:          string
  quantity:      number
  avg_buy_price: number
  asset_type:    string
  skip:          boolean
}

function parseCSV(text: string): string[][] {
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
function parseNum(raw: string): number {
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

function detectColumns(headers: string[]) {
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

function guessAssetType(name: string, ticker: string): string {
  const n = (name + ticker).toLowerCase()
  if (n.includes('etf') || n.includes('fund') || n.includes('iqq') || n.includes('vang') || n.includes('ishares')) return 'etf'
  if (n.includes('bitcoin') || n.includes('eth') || n.includes('crypto') || n.includes('btc')) return 'crypto'
  if (n.includes('gold') || n.includes('silver') || n.includes('xau') || n.includes('xag')) return 'metal'
  return 'stock'
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/

function CsvImportModal({ onClose, onImport }: {
  onClose:  () => void
  onImport: (rows: CsvRow[]) => Promise<void>
}) {
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
              {step === 'upload' ? 'Import Portfolio CSV' : `Preview — ${rows.filter(r => !r.skip).length} holdings`}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
              {step === 'upload' ? 'Trade Republic · eToro · Degiro · any broker export' : 'Uncheck rows you don\'t want to import'}
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
                  <input value={row.ticker}
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, ticker: e.target.value.toUpperCase() } : r))}
                    style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '6px', padding: '5px 8px', color: 'var(--t1)', fontSize: '12px', fontWeight: 600, width: '100%' }} />
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
            <button onClick={handleImport} disabled={importing || rows.filter(r => !r.skip).length === 0}
              style={{ flex: 2, padding: '10px', background: 'var(--gr)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.7 : 1 }}>
              {importing ? 'Importing…' : `Import ${rows.filter(r => !r.skip).length} holding${rows.filter(r => !r.skip).length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TROY_OZ_TO_GRAMS = 31.1034768

const METAL_OPTIONS: Record<string, { label: string; symbol: string; color: string }> = {
  'GC=F': { label: 'Gold',   symbol: 'Au', color: 'var(--go2)' },
  'SI=F': { label: 'Silver', symbol: 'Ag', color: '#A8A9AD'    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(n: number): string {
  return `€${Math.abs(n).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
function sign(n: number): string { return n >= 0 ? '+' : '-' }

const HOLDING_COLORS: Record<string, string> = {
  NVDA: 'var(--am2)', MSFT: 'var(--ac)',
  IQQW: 'var(--gr2)', 'IQQW.DE': 'var(--gr2)',
  IQQH: 'var(--pu)',  'IQQH.DE': 'var(--pu)',
  ICLN: 'var(--pu)',  AAPL: 'var(--ac2)',
  AMZN: 'var(--am2)', GOOGL: 'var(--re)', META: 'var(--ac)',
  'GC=F': 'var(--go2)', 'SI=F': '#A8A9AD',
}
function holdingColor(ticker: string): string {
  return HOLDING_COLORS[ticker] ?? 'var(--go2)'
}

// ── Ticker Search ─────────────────────────────────────────────────────────────

interface SearchResult { ticker: string; name: string; exchange: string; type: string }

function TickerSearch({
  value,
  displayName,
  onSelect,
  inp,
}: {
  value:       string
  displayName: string
  onSelect:    (ticker: string, name: string) => void
  inp:         React.CSSProperties
}) {
  const [query,    setQuery]    = useState(value || displayName || '')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [selected, setSelected] = useState(!!value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(v: string) {
    setQuery(v)
    setSelected(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (v.length < 2) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/portfolio/search?q=${encodeURIComponent(v)}`)
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(true)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 300)
  }

  function pick(r: SearchResult) {
    setQuery(`${r.ticker} — ${r.name}`)
    setResults([])
    setOpen(false)
    setSelected(true)
    onSelect(r.ticker, r.name)
  }

  function clear() {
    setQuery('')
    setSelected(false)
    onSelect('', '')
  }

  const TYPE_COLOR: Record<string, string> = {
    equity:         'var(--ac)',
    etf:            'var(--gr2)',
    etp:            'var(--go2)',
    cryptocurrency: 'var(--am2)',
  }

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef} style={{ position: 'relative' }}>
      <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>
        Stock / ETF / Crypto
      </label>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="Search by name or ticker — e.g. Microsoft, NVDA…"
          style={{
            ...inp,
            paddingRight: selected ? '36px' : inp.padding as string,
            borderColor: selected ? 'var(--gr2)' : undefined,
          }}
        />
        {selected && (
          <button onClick={clear}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: '16px', lineHeight: 1,
            }}
            title="Clear selection">×</button>
        )}
        {loading && (
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', fontSize: '11px' }}>
            …
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: '10px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>
          {results.map(r => (
            <button key={r.ticker} onClick={() => pick(r)}
              className="w-full text-left flex items-center gap-3 px-4 py-2.5"
              style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--bd)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--s3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ color: 'var(--t1)', fontWeight: 700, fontSize: '13px', minWidth: '60px' }}>{r.ticker}</span>
              <span style={{ color: 'var(--t2)', fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span style={{ color: 'var(--t3)', fontSize: '10px' }}>{r.exchange}</span>
                <span style={{
                  background: `color-mix(in srgb, ${TYPE_COLOR[r.type] ?? 'var(--ac)'} 15%, transparent)`,
                  color: TYPE_COLOR[r.type] ?? 'var(--ac)',
                  fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.06em',
                }}>{r.type.toUpperCase()}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add / Edit Holding Modal ──────────────────────────────────────────────────

type SaveData = Parameters<ReturnType<typeof usePortfolio>['addHolding']>[0]

function HoldingModal({
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

// ── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({ slices }: { slices: Array<{ pct: number; color: string }> }) {
  // SVG donut: circumference = 2π × 15.9155 ≈ 100 (convenient unit)
  // dashoffset = 25 starts at 12 o'clock; subtract accumulated pct for each segment
  let acc = 0
  const segments = slices
    .filter(s => s.pct > 1)
    .map(s => {
      const dashoffset = 25 - acc
      acc += s.pct
      return { ...s, dashoffset, dash: Math.max(0, s.pct - 0.8) }
    })

  return (
    <svg viewBox="0 0 36 36" style={{ width: '108px', height: '108px', flexShrink: 0 }}>
      {/* Track */}
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3.8" />
      {segments.map((s, i) => (
        <circle key={i}
          cx="18" cy="18" r="15.9155"
          fill="none"
          stroke={s.color}
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeDasharray={`${s.dash} ${100 - s.dash}`}
          strokeDashoffset={s.dashoffset}
        />
      ))}
    </svg>
  )
}

// ── Breakdown categories (order = donut order) ────────────────────────────────

const BREAKDOWN_CATS: Array<{ key: string; label: string; color: string }> = [
  { key: 'etf',    label: 'ETFs',    color: '#00FF85' },
  { key: 'tech',   label: 'Tech',    color: '#4D8FFF' },
  { key: 'stock',  label: 'Stocks',  color: '#A87EFF' },
  { key: 'metal',  label: 'Metals',  color: '#FFB830' },
  { key: 'crypto', label: 'Crypto',  color: '#F5B040' },
  { key: 'cash',   label: 'Cash',    color: '#707070' },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function PortfolioTab() {
  const {
    holdings, loading, priceLoading, priceError, eurUsdRate,
    totalValueEur, totalCostEur, totalPnlEur, totalPnlPct,
    addHolding, updateHolding, deleteHolding, reload,
  } = usePortfolio()

  const [modal,      setModal]      = useState<{ open: boolean; existing?: HoldingWithPrice }>({ open: false })
  const [csvModal,   setCsvModal]   = useState(false)
  const [sortBy,     setSortBy]     = useState<'default' | 'pnl' | 'alloc'>('default')
  const [selectMode, setSelectMode] = useState(false)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [deleting,   setDeleting]   = useState(false)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleSelectAll() {
    if (selected.size === sortedHoldings.length) setSelected(new Set())
    else setSelected(new Set(sortedHoldings.map(h => h.id)))
  }
  async function deleteSelected() {
    if (selected.size === 0) return
    setDeleting(true)
    for (const id of selected) await deleteHolding(id)
    setSelected(new Set())
    setSelectMode(false)
    setDeleting(false)
  }

  async function handleCsvImport(rows: CsvRow[]) {
    for (const row of rows) {
      await addHolding({
        ticker:        row.ticker,
        name:          row.name,
        asset_type:    row.asset_type,
        quantity:      row.quantity,
        avg_buy_price: row.avg_buy_price,
        currency:      'EUR',
      })
    }
  }

  const sortedHoldings = [...holdings].sort((a, b) => {
    if (sortBy === 'pnl') {
      // Holdings with prices first, sorted by pnlPct desc
      if (a.pnlPct === null && b.pnlPct === null) return 0
      if (a.pnlPct === null) return 1
      if (b.pnlPct === null) return -1
      return (b.pnlPct ?? 0) - (a.pnlPct ?? 0)
    }
    if (sortBy === 'alloc') {
      const aVal = a.currentValueEur ?? a.costBasisEur ?? 0
      const bVal = b.currentValueEur ?? b.costBasisEur ?? 0
      return bVal - aVal
    }
    return 0 // default: DB insertion order
  })

  // Asset-type breakdown (auto-categorised)
  const breakdownMap = new Map<string, number>()
  for (const h of holdings) {
    const val = h.currentValueEur ?? h.costBasisEur ?? 0
    if (val <= 0) continue
    // Split 'stock' into 'tech' when sector says so
    const cat: string = (h.asset_type === 'stock' && h.sector?.toLowerCase().includes('tech'))
      ? 'tech'
      : h.asset_type
    breakdownMap.set(cat, (breakdownMap.get(cat) ?? 0) + val)
  }

  const totalBreakdown = Array.from(breakdownMap.values()).reduce((s, v) => s + v, 0) || 1
  const breakdownEntries = BREAKDOWN_CATS
    .map(cat => ({ ...cat, value: breakdownMap.get(cat.key) ?? 0 }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)

  const donutSlices = breakdownEntries.map(c => ({
    pct:   (c.value / totalBreakdown) * 100,
    color: c.color,
  }))

  const techPct = ((breakdownMap.get('tech') ?? 0) / totalBreakdown) * 100

  return (
    <div className="flex flex-col gap-4">

      {/* Price error banner */}
      {priceError && !priceLoading && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{ background: 'rgba(255,51,71,0.08)', border: '1px solid rgba(255,51,71,0.25)' }}>
          <div>
            <p style={{ color: 'var(--re)', fontSize: '13px', fontWeight: 600 }}>Live prices unavailable</p>
            <p style={{ color: 'var(--t3)', fontSize: '12px', marginTop: '2px' }}>
              Showing cost basis only. Error: {priceError}
            </p>
          </div>
          <button onClick={() => reload()}
            style={{ background: 'var(--re)', border: 'none', color: 'white', fontSize: '12px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}>
            Retry
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Value"
          value={loading ? '—' : fmtEur(totalValueEur)}
          change={priceLoading ? 'Fetching live prices…' : priceError ? 'Cost basis only' : `EUR/USD: ${eurUsdRate.toFixed(4)}`}
          changePositive={null}
          barColor="var(--go2)"
        />
        <MetricCard
          title="Total Gain / Loss"
          value={loading ? '—' : `${sign(totalPnlEur)}${fmtEur(totalPnlEur)}`}
          change={loading ? '—' : fmtPct(totalPnlPct)}
          changePositive={totalPnlEur >= 0}
          barColor="var(--gr)"
        />
        <MetricCard
          title="Cost Basis"
          value={loading ? '—' : fmtEur(totalCostEur)}
          change="Total invested"
          changePositive={null}
          barColor="var(--ac)"
        />
        <MetricCard
          title="Tech Exposure"
          value={`${techPct.toFixed(0)}%`}
          change={techPct > 60 ? '⚠ Overweight' : 'Within limits'}
          changePositive={techPct <= 60}
          barColor="var(--am)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Holdings table */}
        <div className="lg:col-span-3">
          <Panel title="Holdings" noPadding action={
            <div className="portfolio-panel-actions flex gap-2">
              {/* Sort toggle */}
              <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--bd2)' }}>
                {([['default', 'Default'], ['pnl', 'P&L %'], ['alloc', 'Size']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val)}
                    style={{
                      padding: '4px 10px', fontSize: '11px', border: 'none', cursor: 'pointer',
                      background: sortBy === val ? 'var(--s4)' : 'var(--s2)',
                      color: sortBy === val ? 'var(--t1)' : 'var(--t3)',
                      borderRight: val !== 'alloc' ? '1px solid var(--bd2)' : 'none',
                    }}>{label}</button>
                ))}
              </div>
              <button onClick={() => reload()} disabled={priceLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                style={{ background: 'var(--s3)', border: '1px solid var(--bd2)', color: priceLoading ? 'var(--t3)' : 'var(--t2)', fontSize: '12px', cursor: priceLoading ? 'not-allowed' : 'pointer' }}>
                {priceLoading ? '⟳ …' : '⟳'}
              </button>
              {selectMode ? (
                <>
                  <button onClick={toggleSelectAll}
                    style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--s3)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t2)', cursor: 'pointer' }}>
                    {selected.size === sortedHoldings.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <button onClick={deleteSelected} disabled={selected.size === 0 || deleting}
                    style={{ padding: '4px 10px', fontSize: '11px', background: selected.size > 0 ? 'rgba(255,61,80,0.15)' : 'var(--s3)', border: `1px solid ${selected.size > 0 ? 'rgba(255,61,80,0.35)' : 'var(--bd2)'}`, borderRadius: '6px', color: selected.size > 0 ? 'var(--re)' : 'var(--t3)', cursor: selected.size > 0 ? 'pointer' : 'default', fontWeight: 600 }}>
                    {deleting ? 'Deleting…' : `Delete${selected.size > 0 ? ` (${selected.size})` : ''}`}
                  </button>
                  <button onClick={() => { setSelectMode(false); setSelected(new Set()) }}
                    style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--s3)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t2)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectMode(true)}
                    style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--s3)', border: '1px solid var(--bd2)', borderRadius: '6px', color: 'var(--t2)', cursor: 'pointer' }}>
                    Select
                  </button>
                  <button onClick={() => setCsvModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                    style={{ background: 'var(--s3)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '12px', cursor: 'pointer' }}>
                    ↑ CSV
                  </button>
                  <button onClick={() => setModal({ open: true })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                    style={{ background: 'var(--gr)', border: 'none', color: 'white', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>
                    + Add
                  </button>
                </>
              )}
            </div>
          }>
            <div className="portfolio-table-wrap">
            {/* Header — fixed widths match row cells exactly */}
            <div className="flex items-center px-4 py-2"
              style={{ borderBottom: '1px solid var(--bd)', fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.04em' }}>
              <span style={{ width: '110px', flexShrink: 0 }}>ASSET</span>
              <span style={{ flex: 1, minWidth: 0 }}>ALLOCATION</span>
              <span style={{ width: '82px', flexShrink: 0, textAlign: 'right' }}>CURRENT</span>
              <span style={{ width: '76px', flexShrink: 0, textAlign: 'right' }}>COST</span>
              <span style={{ width: '82px', flexShrink: 0, textAlign: 'right' }}>P&amp;L</span>
              <span style={{ width: '58px', flexShrink: 0, textAlign: 'right' }}>TODAY</span>
              <span style={{ width: '36px', flexShrink: 0 }} />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span style={{ color: 'var(--t3)', fontSize: '13px' }}>Loading…</span>
              </div>
            ) : holdings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <p style={{ color: 'var(--t2)', fontSize: '13px' }}>No holdings yet.</p>
                <button onClick={() => setModal({ open: true })}
                  style={{ background: 'var(--ac)', border: 'none', color: 'white', fontSize: '13px', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' }}>
                  + Add your first holding
                </button>
              </div>
            ) : (
              sortedHoldings.map(h => {
                const isMetal  = h.asset_type === 'metal'
                const meta     = isMetal ? METAL_OPTIONS[h.ticker] : null
                const alloc    = totalValueEur > 0 ? ((h.currentValueEur ?? h.costBasisEur ?? 0) / totalValueEur) * 100 : 0
                const color    = holdingColor(h.ticker)
                const isProfit = (h.pnlEur ?? 0) >= 0

                // Short display name — ticker for stocks, metal label for metals
                const tickerLabel = isMetal ? (meta?.label ?? h.name) : h.ticker
                // Truncate long names to 18 chars
                const nameLabel = isMetal
                  ? `${h.quantity.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}g`
                  : ((h.name ?? '').length > 20 ? (h.name ?? '').slice(0, 18) + '…' : (h.name ?? ''))

                return (
                  <div key={h.id}
                    className="flex items-center px-4 py-3 transition-colors group"
                    onClick={selectMode ? () => toggleSelect(h.id) : undefined}
                    style={{ borderBottom: '1px solid var(--bd)', cursor: selectMode ? 'pointer' : 'default', background: selectMode && selected.has(h.id) ? 'rgba(255,61,80,0.06)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--s3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = selectMode && selected.has(h.id) ? 'rgba(255,61,80,0.06)' : 'transparent')}>

                    {/* Asset — fixed width, no overflow */}
                    <div style={{ width: '110px', flexShrink: 0, minWidth: 0 }}>
                      <div className="flex items-center gap-1.5">
                        {isMetal && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />}
                        <p style={{ color: 'var(--t1)', fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tickerLabel}
                        </p>
                      </div>
                      <p style={{ color: 'var(--t3)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                        {nameLabel}
                      </p>
                    </div>

                    {/* Allocation bar — flex fills remaining space */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '8px' }}>
                      <div style={{ flex: 1, height: '4px', background: 'var(--s3)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${alloc}%`, height: '100%', background: color, borderRadius: '4px' }} />
                      </div>
                      <span style={{ color: 'var(--t2)', fontSize: '11px', width: '34px', textAlign: 'right', flexShrink: 0 }}>{alloc.toFixed(1)}%</span>
                    </div>

                    {/* Current value */}
                    <div style={{ width: '82px', flexShrink: 0, textAlign: 'right' }}>
                      {h.currentValueEur !== null ? (
                        <p style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500 }}>{fmtEur(h.currentValueEur)}</p>
                      ) : (
                        <p style={{ color: 'var(--t3)', fontSize: '12px' }}>—</p>
                      )}
                      {h.currentPriceEur !== null && (
                        <p style={{ color: 'var(--t3)', fontSize: '10px' }}>
                          €{h.currentPriceEur < 10 ? h.currentPriceEur.toFixed(4) : h.currentPriceEur.toFixed(2)}{isMetal ? '/g' : '/sh'}
                        </p>
                      )}
                    </div>

                    {/* Cost basis */}
                    <div style={{ width: '76px', flexShrink: 0, textAlign: 'right' }}>
                      <p style={{ color: 'var(--t2)', fontSize: '12px' }}>
                        {h.costBasisEur !== null ? fmtEur(h.costBasisEur) : '—'}
                      </p>
                      {h.avg_buy_price && (
                        <p style={{ color: 'var(--t3)', fontSize: '10px' }}>
                          €{h.avg_buy_price.toFixed(2)}{isMetal ? '/g' : ' avg'}
                        </p>
                      )}
                    </div>

                    {/* P&L */}
                    <div style={{ width: '82px', flexShrink: 0, textAlign: 'right' }}>
                      {h.pnlEur !== null ? (
                        <>
                          <p className="num" style={{ color: isProfit ? 'var(--gr2)' : 'var(--re)', fontSize: '12px', fontWeight: 700 }}>
                            {sign(h.pnlEur)}{fmtEur(h.pnlEur)}
                          </p>
                          <p style={{ color: isProfit ? 'var(--gr2)' : 'var(--re)', fontSize: '11px', opacity: 0.8 }}>
                            {fmtPct(h.pnlPct ?? 0)}
                          </p>
                        </>
                      ) : (
                        <p style={{ color: 'var(--t3)', fontSize: '12px' }}>—</p>
                      )}
                    </div>

                    {/* Today */}
                    <div style={{ width: '58px', flexShrink: 0, textAlign: 'right' }}>
                      {h.change1d !== null ? (
                        <>
                          <p style={{ color: h.change1d >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '12px', fontWeight: 500 }}>
                            {fmtPct(h.change1d)}
                          </p>
                          {h.currentValueEur !== null && (
                            <p style={{ color: h.change1d >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: '11px', opacity: 0.8 }}>
                              {h.change1d >= 0 ? '+' : '−'}€{Math.abs(h.currentValueEur * h.change1d / 100).toFixed(2)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p style={{ color: 'var(--t3)', fontSize: '12px' }}>—</p>
                      )}
                      {h.marketState && !isMetal && (
                        <p style={{ color: 'var(--t3)', fontSize: '10px' }}>
                          {h.marketState === 'REGULAR' ? '● live' : h.marketState === 'CLOSED' ? 'closed' : 'ext'}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {selectMode ? (
                      <div style={{ width: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="checkbox" checked={selected.has(h.id)}
                          onChange={() => toggleSelect(h.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--re)' }} />
                      </div>
                    ) : (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: '36px', flexShrink: 0, justifyContent: 'flex-end' }}>
                        <button onClick={() => setModal({ open: true, existing: h })}
                          style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: '14px', padding: '2px 3px' }}
                          title="Edit">✎</button>
                        <button onClick={() => { if (confirm(`Remove ${h.ticker}?`)) deleteHolding(h.id) }}
                          style={{ background: 'none', border: 'none', color: 'var(--re)', cursor: 'pointer', fontSize: '14px', padding: '2px 3px' }}
                          title="Remove">×</button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
            </div>{/* end portfolio-table-wrap */}
          </Panel>
        </div>

        {/* Right: Stats */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Asset breakdown */}
          <Panel title="Diversification">
            {breakdownEntries.length === 0 ? (
              <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Add holdings to see breakdown.</p>
            ) : (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {/* Donut */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutChart slices={donutSlices} />
                  {/* Centre label */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <p style={{ color: 'var(--t1)', fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>{breakdownEntries.length}</p>
                    <p style={{ color: 'var(--t3)', fontSize: '9px', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '2px' }}>types</p>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {breakdownEntries.map(cat => {
                    const pct = (cat.value / totalBreakdown) * 100
                    const isOver = cat.key === 'tech' && pct > 60
                    return (
                      <div key={cat.key}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: cat.color, flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ color: 'var(--t2)', fontSize: '12px' }}>{cat.label}</span>
                            {isOver && <span style={{ color: 'var(--am2)', fontSize: '10px' }}>⚠</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{fmtEur(cat.value)}</span>
                            <span style={{ color: cat.color, fontSize: '12px', fontWeight: 700, minWidth: '38px', textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div style={{ height: '3px', background: 'var(--s3)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: cat.color, opacity: 0.75 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Panel>

          {/* Summary */}
          <Panel title="Summary">
            <div className="flex flex-col gap-2">
              {[
                { label: 'Total invested',  value: fmtEur(totalCostEur),  color: 'var(--t1)' },
                { label: 'Current value',   value: fmtEur(totalValueEur), color: 'var(--t1)' },
                { label: 'Unrealised P&L',  value: `${sign(totalPnlEur)}${fmtEur(totalPnlEur)}`, color: totalPnlEur >= 0 ? 'var(--gr2)' : 'var(--re)' },
                { label: 'Return',          value: fmtPct(totalPnlPct),   color: totalPnlPct >= 0 ? 'var(--gr2)' : 'var(--re)' },
                { label: 'EUR/USD rate',    value: eurUsdRate.toFixed(4),  color: 'var(--t2)' },
                { label: 'Holdings',        value: `${holdings.length} positions`, color: 'var(--t2)' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: '1px solid var(--bd)' }}>
                  <span style={{ color: 'var(--t2)', fontSize: '12px' }}>{row.label}</span>
                  <span className="num" style={{ color: row.color, fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Price source note */}
          <div className="rounded-lg p-3" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
            <p style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: '1.6' }}>
              Prices from <strong style={{ color: 'var(--t2)' }}>Yahoo Finance</strong> · updated every 5 min · EUR/USD live FX · metals via futures (GC=F, SI=F) in USD/troy oz converted to EUR/gram
            </p>
          </div>
        </div>
      </div>

      {modal.open && (
        <HoldingModal
          existing={modal.existing}
          onSave={modal.existing ? (d) => updateHolding(modal.existing!.id, d as Parameters<typeof updateHolding>[1]) : addHolding}
          onClose={() => setModal({ open: false })}
        />
      )}

      {csvModal && (
        <CsvImportModal
          onClose={() => setCsvModal(false)}
          onImport={handleCsvImport}
        />
      )}
    </div>
  )
}
