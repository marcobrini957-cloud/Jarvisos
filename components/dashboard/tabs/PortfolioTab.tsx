'use client'

import { useState } from 'react'
import { usePortfolio, type HoldingWithPrice } from '@/hooks/usePortfolio'
import MetricCard from '@/components/ui/MetricCard'
import Panel from '@/components/ui/Panel'
import { Label, Num, Segmented } from '@/components/ui/vq'
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
    <div className="flex flex-col gap-3">

      {/* CSV result banner */}
      {csvResult && (
        <div className="flex items-center justify-between"
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-up-dim)', borderLeft: '2px solid var(--color-up)' }}>
          <p style={{ color: 'var(--color-up)', fontSize: 'var(--text-base)' }}>{csvResult}</p>
          <button onClick={() => setCsvResult(null)}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 'var(--text-lg)', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* Price error banner */}
      {priceError && !priceLoading && (
        <div className="flex items-center justify-between"
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-down-dim)', borderLeft: '2px solid var(--color-down)' }}>
          <div>
            <p style={{ color: 'var(--color-down)', fontSize: 'var(--text-base)' }}>Live prices unavailable</p>
            <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)', marginTop: '2px' }}>
              Showing cost basis only. Error: {priceError}
            </p>
          </div>
          <button onClick={() => reload()}
            style={{ background: 'var(--re)', border: 'none', color: 'white', fontSize: 'var(--text-base)', padding: '6px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', flexShrink: 0 }}>
            Retry
          </button>
        </div>
      )}

      {/* Total net worth — trading equity + all holdings */}
      <NetWorthCard holdingsValueEur={totalValueEur} holdingsLoading={loading || priceLoading} />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricCard
          title="Total value"
          value={loading ? '—' : fmtEur(totalValueEur)}
          change={priceLoading ? 'Fetching live prices…' : priceError ? 'Cost basis only' : 'Live market value'}
          changePositive={null}
        />
        <MetricCard
          title="Total gain / loss"
          value={loading ? '—' : `${sign(totalPnlEur)}${fmtEur(totalPnlEur)}`}
          change={loading ? '—' : fmtPct(totalPnlPct)}
          changePositive={totalPnlEur >= 0}
        />
        <MetricCard
          title="Cost basis"
          value={loading ? '—' : fmtEur(totalCostEur)}
          change="Total invested"
          changePositive={null}
        />
        <MetricCard
          title="Tech exposure"
          value={`${techPct.toFixed(0)}%`}
          change={techPct > 60 ? '⚠ Overweight' : 'Within limits'}
          changePositive={techPct <= 60}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Holdings table */}
        <div className="lg:col-span-3">
          <Panel title="Holdings" noPadding action={
            <div className="portfolio-panel-actions flex gap-2">
              {/* Sort toggle */}
              <Segmented
                options={[{ key: 'default', label: 'Default' }, { key: 'pnl', label: 'P&L %' }, { key: 'alloc', label: 'Size' }]}
                value={sortBy}
                onChange={setSortBy}
              />
              <button onClick={() => reload()} disabled={priceLoading}
                className="flex items-center gap-1.5"
                style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)', background: 'transparent', border: '1px solid var(--color-line-1)', color: priceLoading ? 'var(--color-ink-4)' : 'var(--color-ink-2)', cursor: 'pointer' }}>
                {priceLoading ? '⟳ …' : '⟳'}
              </button>
              {selectMode ? (
                <>
                  <button onClick={toggleSelectAll}
                    style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)', background: 'transparent', border: '1px solid var(--color-line-1)', color: 'var(--color-ink-2)', cursor: 'pointer' }}>
                    {selected.size === sortedHoldings.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <button onClick={deleteSelected} disabled={selected.size === 0 || deleting}
                    style={{ padding: '4px 10px', fontSize: 'var(--text-base)', background: selected.size > 0 ? 'var(--color-down-dim)' : 'transparent', border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-sm)', color: selected.size > 0 ? 'var(--color-down)' : 'var(--color-ink-4)', cursor: selected.size > 0 ? 'pointer' : 'default' }}>
                    {deleting ? 'Deleting…' : `Delete${selected.size > 0 ? ` (${selected.size})` : ''}`}
                  </button>
                  <button onClick={() => { setSelectMode(false); setSelected(new Set()) }}
                    style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)', background: 'transparent', border: '1px solid var(--color-line-1)', color: 'var(--color-ink-2)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectMode(true)}
                    style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)', background: 'transparent', border: '1px solid var(--color-line-1)', color: 'var(--color-ink-2)', cursor: 'pointer' }}>
                    Select
                  </button>
                  <button onClick={() => setCsvModal('add')}
                    className="flex items-center gap-1.5"
                    style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)', background: 'transparent', border: '1px solid var(--color-line-1)', color: 'var(--color-ink-2)', cursor: 'pointer' }}>
                    ↑ CSV
                  </button>
                  <button onClick={() => setCsvModal('update')}
                    className="flex items-center gap-1.5 px-3 py-1.5 vq-r"
                    title="Upload a CSV to refresh existing holdings and add new ones — never creates duplicates"
                    style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)', background: 'transparent', border: '1px solid var(--color-line-1)', color: 'var(--color-ink-2)', cursor: 'pointer' }}>
                    ⟳ Update
                  </button>
                  <button onClick={() => setModal({ open: true })}
                    className="flex items-center gap-1.5"
                    style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)', background: 'var(--color-ink-1)', border: 'none', color: 'var(--color-void)', cursor: 'pointer' }}>
                    + Add
                  </button>
                </>
              )}
            </div>
          }>
            <div className="portfolio-table-wrap">
            {/* Header — fixed widths match row cells exactly */}
            <div className="flex items-center"
              style={{ padding: '6px 14px', borderBottom: '1px solid var(--color-line-1)' }}>
              <span style={{ width: '110px', flexShrink: 0 }}><Label>Asset</Label></span>
              <span style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}><Label>Allocation</Label></span>
              <span style={{ width: '82px', flexShrink: 0, textAlign: 'right' }}><Label>Current</Label></span>
              <span style={{ width: '76px', flexShrink: 0, textAlign: 'right' }}><Label>Cost</Label></span>
              <span style={{ width: '82px', flexShrink: 0, textAlign: 'right' }}><Label>P&amp;L</Label></span>
              <span style={{ width: '58px', flexShrink: 0, textAlign: 'right' }}><Label>Today</Label></span>
              <span style={{ width: '36px', flexShrink: 0 }} />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>Loading…</span>
              </div>
            ) : holdings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>No holdings yet.</p>
                <button onClick={() => setModal({ open: true })}
                  style={{ background: 'var(--color-ink-1)', border: 'none', color: 'var(--color-void)', fontSize: 'var(--text-base)', padding: '8px 20px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
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
                    className="flex items-center transition-colors group"
                    onClick={selectMode ? () => toggleSelect(h.id) : undefined}
                    style={{ padding: '7px 14px', borderBottom: '1px solid var(--color-line-1)', cursor: selectMode ? 'pointer' : 'default', background: selectMode && selected.has(h.id) ? 'rgba(240,80,75,0.06)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-state-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = selectMode && selected.has(h.id) ? 'rgba(240,80,75,0.06)' : 'transparent')}>

                    {/* Asset — fixed width, no overflow */}
                    <div style={{ width: '110px', flexShrink: 0, minWidth: 0 }}>
                      <div className="flex items-center gap-1.5">
                        {isMetal && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />}
                        <p className="vq-num" style={{ color: 'var(--color-ink-1)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tickerLabel}
                        </p>
                      </div>
                      <p style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                        {nameLabel}
                      </p>
                    </div>

                    {/* Allocation bar — flex fills remaining space */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '8px' }}>
                      <div style={{ flex: 1, height: '3px', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                        <div style={{ width: `${alloc}%`, height: '100%', background: 'var(--color-ink-3)' }} />
                      </div>
                      <span className="vq-num" style={{ color: 'var(--t2)', fontSize: 'var(--text-sm)', width: '34px', textAlign: 'right', flexShrink: 0 }}>{alloc.toFixed(1)}%</span>
                    </div>

                    {/* Current value */}
                    <div style={{ width: '82px', flexShrink: 0, textAlign: 'right' }}>
                      {h.currentValueEur !== null ? (
                        <p className="vq-num" style={{ color: 'var(--t1)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmtEur(h.currentValueEur)}</p>
                      ) : (
                        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>—</p>
                      )}
                      {h.currentPriceEur !== null && (
                        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>
                          €{h.currentPriceEur < 10 ? h.currentPriceEur.toFixed(4) : h.currentPriceEur.toFixed(2)}{isMetal ? '/g' : '/sh'}
                        </p>
                      )}
                    </div>

                    {/* Cost basis */}
                    <div style={{ width: '76px', flexShrink: 0, textAlign: 'right' }}>
                      <p className="vq-num" style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>
                        {h.costBasisEur !== null ? fmtEur(h.costBasisEur) : '—'}
                      </p>
                      {h.avg_buy_price && (
                        <p className="vq-num" style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>
                          €{h.avg_buy_price.toFixed(2)}{isMetal ? '/g' : ' avg'}
                        </p>
                      )}
                    </div>

                    {/* P&L */}
                    <div style={{ width: '82px', flexShrink: 0, textAlign: 'right' }}>
                      {h.pnlEur !== null ? (
                        <>
                          <p className="vq-num" style={{ color: isProfit ? 'var(--color-up)' : 'var(--color-down)', fontSize: 'var(--text-sm)' }}>
                            {sign(h.pnlEur)}{fmtEur(h.pnlEur)}
                          </p>
                          <p className="vq-num" style={{ color: isProfit ? 'var(--color-up)' : 'var(--color-down)', fontSize: 'var(--text-xs)', opacity: 0.75 }}>
                            {fmtPct(h.pnlPct ?? 0)}
                          </p>
                        </>
                      ) : (
                        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>—</p>
                      )}
                    </div>

                    {/* Today */}
                    <div style={{ width: '58px', flexShrink: 0, textAlign: 'right' }}>
                      {h.change1d !== null ? (
                        <>
                          <p className="vq-num" style={{ color: h.change1d >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontSize: 'var(--text-sm)' }}>
                            {fmtPct(h.change1d)}
                          </p>
                          {h.currentValueEur !== null && (
                            <p className="vq-num" style={{ color: h.change1d >= 0 ? 'var(--gr2)' : 'var(--re)', fontSize: 'var(--text-sm)', opacity: 0.8 }}>
                              {h.change1d >= 0 ? '+' : '−'}€{Math.abs(h.currentValueEur * h.change1d / 100).toFixed(2)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>—</p>
                      )}
                      {h.marketState && !isMetal && (
                        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>
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
                          style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 'var(--text-md)', padding: '2px 3px' }}
                          title="Edit">✎</button>
                        <button onClick={() => { if (confirm(`Remove ${h.ticker}?`)) deleteHolding(h.id) }}
                          style={{ background: 'none', border: 'none', color: 'var(--re)', cursor: 'pointer', fontSize: 'var(--text-md)', padding: '2px 3px' }}
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
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Asset breakdown */}
          <Panel title="Diversification">
            {breakdownEntries.length === 0 ? (
              <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)' }}>Add holdings to see breakdown.</p>
            ) : (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {/* Donut */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <DonutChart slices={donutSlices} />
                  {/* Centre label */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <p className="vq-num" style={{ color: 'var(--t1)', fontSize: 'var(--text-md)', fontWeight: 700, lineHeight: 1 }}>{breakdownEntries.length}</p>
                    <p style={{ color: 'var(--t3)', fontSize: 'var(--text-2xs)', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '2px' }}>types</p>
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
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.color, flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>{cat.label}</span>
                            {isOver && <span style={{ color: 'var(--color-warn)', fontSize: 'var(--text-xs)' }}>⚠</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="vq-num" style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>{fmtEur(cat.value)}</span>
                            <span className="vq-num" style={{ color: 'var(--color-ink-1)', fontSize: 'var(--text-sm)', minWidth: '38px', textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div style={{ height: '3px', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: cat.color }} />
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
                { label: 'Total invested',  value: fmtEur(totalCostEur),  color: 'var(--color-ink-1)' },
                { label: 'Current value',   value: fmtEur(totalValueEur), color: 'var(--color-ink-1)' },
                { label: 'Unrealised P&L',  value: `${sign(totalPnlEur)}${fmtEur(totalPnlEur)}`, color: totalPnlEur >= 0 ? 'var(--color-up)' : 'var(--color-down)' },
                { label: 'Return',          value: fmtPct(totalPnlPct),   color: totalPnlPct >= 0 ? 'var(--color-up)' : 'var(--color-down)' },
                { label: 'EUR/USD rate',    value: eurUsdRate.toFixed(4),  color: 'var(--color-ink-2)' },
                { label: 'Holdings',        value: `${holdings.length} positions`, color: 'var(--color-ink-2)' },
              ].map((row, i, arr) => (
                <div key={row.label} className="flex items-center justify-between"
                  style={{ padding: '5px 0', borderBottom: i === arr.length - 1 ? undefined : '1px solid var(--color-line-1)' }}>
                  <span style={{ color: 'var(--color-ink-2)', fontSize: 'var(--text-base)' }}>{row.label}</span>
                  <Num size="sm" style={{ color: row.color }}>{row.value}</Num>
                </div>
              ))}
            </div>
          </Panel>

          {/* Price source note */}
          <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)' }}>
            <p style={{ color: 'var(--color-ink-3)', fontSize: 'var(--text-xs)', lineHeight: '1.6' }}>
              Prices from <strong style={{ color: 'var(--color-ink-2)' }}>Yahoo Finance</strong> · updated every 5 min · EUR/USD live FX · metals via futures (GC=F, SI=F) in USD/troy oz converted to EUR/gram
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
