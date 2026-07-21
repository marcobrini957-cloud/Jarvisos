'use client'

import { useState } from 'react'
import { usePortfolio, type HoldingWithPrice } from '@/hooks/usePortfolio'
import MetricCard from '@/components/ui/MetricCard'
import Panel from '@/components/ui/Panel'
import { CsvImportModal, type CsvRow } from './portfolio/CsvImportModal'
import { METAL_OPTIONS, fmtEur, fmtPct, sign, holdingColor } from './portfolio/helpers'
import { HoldingModal } from './portfolio/HoldingModal'
import { DonutChart, BREAKDOWN_CATS } from './portfolio/DonutChart'
import { NetWorthCard } from './portfolio/NetWorthCard'

// ── Main component ────────────────────────────────────────────────────────────

export default function PortfolioTab() {
  const {
    holdings, loading, priceLoading, priceError, eurUsdRate,
    totalValueEur, totalCostEur, totalPnlEur, totalPnlPct,
    addHolding, updateHolding, upsertHoldings, deleteHolding, reload,
  } = usePortfolio()

  const [modal,      setModal]      = useState<{ open: boolean; existing?: HoldingWithPrice }>({ open: false })
  const [csvModal,   setCsvModal]   = useState<false | 'add' | 'update'>(false)
  const [csvResult,  setCsvResult]  = useState<string | null>(null)
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

  const existingTickers = new Set(holdings.map(h => h.ticker.trim().toUpperCase()))

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
    setCsvResult(`Imported ${rows.length} holding${rows.length !== 1 ? 's' : ''}.`)
  }

  async function handleCsvUpdate(rows: CsvRow[]) {
    const { added, updated } = await upsertHoldings(rows.map(row => ({
      ticker:        row.ticker,
      name:          row.name,
      asset_type:    row.asset_type,
      quantity:      row.quantity,
      avg_buy_price: row.avg_buy_price,
      currency:      'EUR',
    })))
    setCsvResult(`Portfolio updated — ${added} added, ${updated} refreshed. No duplicates created.`)
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

      {/* CSV result banner */}
      {csvResult && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{ background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.25)' }}>
          <p style={{ color: 'var(--gr2)', fontSize: '13px', fontWeight: 600 }}>{csvResult}</p>
          <button onClick={() => setCsvResult(null)}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      )}

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

      {/* Total net worth — trading equity + all holdings */}
      <NetWorthCard holdingsValueEur={totalValueEur} holdingsLoading={loading || priceLoading} />

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
                  <button onClick={() => setCsvModal('add')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                    style={{ background: 'var(--s3)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '12px', cursor: 'pointer' }}>
                    ↑ CSV
                  </button>
                  <button onClick={() => setCsvModal('update')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                    title="Upload a CSV to refresh existing holdings and add new ones — never creates duplicates"
                    style={{ background: 'var(--s3)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '12px', cursor: 'pointer' }}>
                    ⟳ Update
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
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>ALLOCATION</span>
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
          mode={csvModal === 'update' ? 'update' : 'add'}
          existingTickers={existingTickers}
          onClose={() => setCsvModal(false)}
          onImport={csvModal === 'update' ? handleCsvUpdate : handleCsvImport}
        />
      )}
    </div>
  )
}
