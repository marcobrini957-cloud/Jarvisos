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
import Icon from '@/components/ui/Icon'
import { groupHoldings, hasMultipleLots } from '@/lib/portfolio/grouping'

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
  const [search,     setSearch]     = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [grouped,    setGrouped]    = useState(true)
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())

  function toggleExpanded(ticker: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(ticker) ? next.delete(ticker) : next.add(ticker)
      return next
    })
  }

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

  // Ticker or name, case-insensitive. With repeated CSV imports a portfolio can
  // hold the same instrument several times, so finding one by typing beats
  // scrolling a list where NVDA appears three rows apart.
  const query = search.trim().toLowerCase()
  const visibleHoldings = query
    ? holdings.filter(h =>
        h.ticker.toLowerCase().includes(query) ||
        (h.name ?? '').toLowerCase().includes(query))
    : holdings

  // Repeated buys of the same instrument leave one row per purchase. Grouping
  // is display-only — the lots stay in the database, because they record what
  // was paid and when, which averaging away would lose. Expand a line to see
  // them. Totals are unaffected either way: they sum the lots in both modes.
  const canGroup = hasMultipleLots(visibleHoldings)
  const groups   = groupHoldings(visibleHoldings)

  const sortedHoldings = [...visibleHoldings].sort((a, b) => {
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

  const sortedGroups = [...groups].sort((a, b) => {
    if (sortBy === 'pnl') {
      if (a.pnlPct === null && b.pnlPct === null) return 0
      if (a.pnlPct === null) return 1
      if (b.pnlPct === null) return -1
      return (b.pnlPct ?? 0) - (a.pnlPct ?? 0)
    }
    if (sortBy === 'alloc') {
      return (b.currentValueEur ?? b.costBasisEur ?? 0) - (a.currentValueEur ?? a.costBasisEur ?? 0)
    }
    return 0
  })

  const showGrouped = grouped && canGroup

  // One shape for both kinds of line, so the row markup below does not have to
  // branch on whether it is drawing an instrument or a single purchase.
  type Row = {
    key: string
    ticker: string
    name: string | null
    marketName: string | null
    asset_type: string
    quantity: number
    avg_buy_price: number | null
    currentValueEur: number | null
    currentPriceEur: number | null
    costBasisEur: number | null
    pnlEur: number | null
    pnlPct: number | null
    change1d: number | null
    marketState: string | null
    /** Set when the line summarises several purchases. */
    lots: HoldingWithPrice[] | null
    /** Set when the line is one real database row. */
    holding: HoldingWithPrice | null
    isLot: boolean
  }

  const fromHolding = (h: HoldingWithPrice, isLot = false): Row => ({
    key: h.id, ticker: h.ticker, name: h.name ?? null, marketName: h.marketName, asset_type: h.asset_type,
    quantity: h.quantity, avg_buy_price: h.avg_buy_price,
    currentValueEur: h.currentValueEur, currentPriceEur: h.currentPriceEur,
    costBasisEur: h.costBasisEur, pnlEur: h.pnlEur, pnlPct: h.pnlPct,
    change1d: h.change1d, marketState: h.marketState,
    lots: null, holding: h, isLot,
  })

  const displayRows: Row[] = showGrouped
    ? sortedGroups.flatMap(g => {
        const single = g.lots.length === 1
        if (single) return [fromHolding(g.lots[0])]
        const head: Row = {
          key: `g:${g.ticker}`, ticker: g.ticker, name: g.name, marketName: g.marketName, asset_type: g.assetType,
          quantity: g.quantity, avg_buy_price: g.avgBuyPrice,
          currentValueEur: g.currentValueEur, currentPriceEur: g.currentPriceEur,
          costBasisEur: g.costBasisEur, pnlEur: g.pnlEur, pnlPct: g.pnlPct,
          change1d: g.change1d, marketState: g.marketState,
          lots: g.lots, holding: null, isLot: false,
        }
        return expanded.has(g.ticker)
          ? [head, ...g.lots.map(l => fromHolding(l, true))]
          : [head]
      })
    : sortedHoldings.map(h => fromHolding(h))

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

  // Concentration, not sector exposure.
  //
  // "Tech exposure" was derived from holdings.sector, which is populated for 10
  // of 209 rows in practice — the price feed does not return it and nothing
  // asks the user for it, so the figure read 0% for essentially everybody. A
  // metric that is structurally always wrong is worse than no metric.
  //
  // The single largest position answers the question that one was reaching for
  // — am I over-exposed to one thing — and needs only value and total, which
  // every holding has from the moment it is added.
  const positionValues = new Map<string, number>()
  for (const h of holdings) {
    const key = h.ticker.trim().toUpperCase()
    positionValues.set(key, (positionValues.get(key) ?? 0) + (h.currentValueEur ?? 0))
  }
  let topTicker = '—'
  let topValue  = 0
  for (const [k, v] of positionValues) if (v > topValue) { topValue = v; topTicker = k }
  const topPct = totalValueEur > 0 ? (topValue / totalValueEur) * 100 : 0

  return (
    <div className="flex flex-col gap-3">

      {/* CSV result banner */}
      {csvResult && (
        <div className="flex items-center justify-between"
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-up-dim)', borderLeft: '2px solid var(--color-up)' }}>
          <p style={{ color: 'var(--color-up)', fontSize: 'var(--text-base)' }}>{csvResult}</p>
          <button onClick={() => setCsvResult(null)}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 'var(--text-lg)', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}><Icon name="close" size={13} /></button>
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
        {/* Concentration is not P&L. Green on "Within limits" read as profit on
            a line that only means "this is fine", so it stays ink either way. */}
        <MetricCard
          title="Largest position"
          value={loading ? '—' : `${topPct.toFixed(0)}%`}
          change={topTicker === '—' ? 'No holdings yet' : `${topTicker}${topPct > 25 ? ' · concentrated' : ''}`}
          changePositive={null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Holdings table */}
        <div className="lg:col-span-3">
          <Panel data-tour="portfolio-add" title="Holdings" noPadding action={
            <div className="portfolio-panel-actions flex gap-2">
              {/* Search — an icon until it is needed, then an input. A permanent
                  search box in a header this crowded costs more room than it is
                  worth on a portfolio with six rows. */}
              {searchOpen || query ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false) } }}
                    placeholder="Search holdings…"
                    aria-label="Search holdings by name or ticker"
                    style={{
                      width: '150px', background: 'var(--s2)',
                      border: '1px solid var(--color-line-3)', borderRadius: 'var(--radius-sm)',
                      padding: '4px 9px', color: 'var(--color-ink-1)',
                      fontSize: 'var(--text-base)', outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => { setSearch(''); setSearchOpen(false) }}
                    aria-label="Clear search"
                    style={{ background: 'none', border: 'none', color: 'var(--color-ink-3)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search holdings"
                  title="Search holdings"
                  className="flex items-center"
                  style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: '1px solid var(--color-line-1)', color: 'var(--color-ink-2)', cursor: 'pointer' }}
                >
                  <Icon name="search" size={12} />
                </button>
              )}

              {/* Only offered when the portfolio actually repeats an
                  instrument; on a clean list the control would do nothing. */}
              {canGroup && (
                <button
                  onClick={() => setGrouped(g => !g)}
                  aria-pressed={grouped}
                  title={grouped ? 'Showing one line per instrument — click for every purchase' : 'Showing every purchase — click to group by instrument'}
                  style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)',
                    background: grouped ? 'var(--color-surface-3)' : 'transparent',
                    border: '1px solid var(--color-line-1)',
                    color: grouped ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {grouped ? 'Grouped' : 'All lots'}
                </button>
              )}

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
                    <Icon name="upload" size={11} /> CSV
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
              <span style={{ width: '164px', flexShrink: 0 }}><Label>Asset</Label></span>
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
            ) : query && sortedHoldings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>
                  Nothing matches &ldquo;{search.trim()}&rdquo;.
                </p>
                <button onClick={() => { setSearch(''); setSearchOpen(false) }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-ink-3)', fontSize: 'var(--text-sm)', cursor: 'pointer', textDecoration: 'underline dotted' }}>
                  Clear search
                </button>
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
              displayRows.map(h => {
                const isMetal  = h.asset_type === 'metal'
                const meta     = isMetal ? METAL_OPTIONS[h.ticker] : null
                const alloc    = totalValueEur > 0 ? ((h.currentValueEur ?? h.costBasisEur ?? 0) / totalValueEur) * 100 : 0
                const color    = holdingColor(h.ticker)
                const isProfit = (h.pnlEur ?? 0) >= 0

                // The instrument leads, the symbol follows. "CSSPX.MI" tells
                // you nothing on its own — "Core S&P 500 USD (Acc)" does. The
                // ticker still matters for looking a position up, so it stays
                // as the second line rather than disappearing.
                const primaryLabel = isMetal
                  ? (meta?.label ?? h.name ?? h.ticker)
                  : (h.name?.trim() || h.marketName?.trim() || h.ticker)

                // Second line: the symbol, plus what kind of line this is.
                const detail = h.lots
                  ? `${h.lots.length} purchases`
                  : h.isLot
                    ? `${h.quantity.toLocaleString('de-AT', { maximumFractionDigits: 4 })} @ €${(h.avg_buy_price ?? 0).toFixed(2)}`
                    : isMetal
                      ? `${h.quantity.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}g`
                      : null
                // If we had no name to show, the ticker is already the headline —
                // repeating it underneath would just be the same word twice.
                const secondaryLabel = isMetal
                  ? (detail ?? h.ticker)
                  : [primaryLabel === h.ticker ? null : h.ticker, detail].filter(Boolean).join(' · ')

                // A group line stands for its lots: selecting or deleting it
                // acts on every purchase behind it, never on a phantom row.
                const rowIds  = h.lots ? h.lots.map(l => l.id) : h.holding ? [h.holding.id] : []
                const isPicked = rowIds.length > 0 && rowIds.every(id => selected.has(id))
                const pickRow = () => setSelected(prev => {
                  const next = new Set(prev)
                  if (isPicked) rowIds.forEach(id => next.delete(id))
                  else          rowIds.forEach(id => next.add(id))
                  return next
                })

                return (
                  <div key={h.key}
                    className="flex items-center transition-colors group"
                    onClick={selectMode ? pickRow : undefined}
                    style={{ padding: '7px 14px', paddingLeft: h.isLot ? '30px' : '14px', borderBottom: '1px solid var(--color-line-1)', cursor: selectMode ? 'pointer' : 'default', background: isPicked && selectMode ? 'rgba(240,80,75,0.06)' : h.isLot ? 'rgba(255,255,255,0.015)' : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-state-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isPicked && selectMode ? 'rgba(240,80,75,0.06)' : h.isLot ? 'rgba(255,255,255,0.015)' : 'transparent')}>

                    {/* Asset — the name reads first; the ticker is the subtitle.
                        Truncation is CSS, not a slice at 18 characters, so the
                        full name is still there on hover and grows with the
                        column instead of being destroyed on the way in. */}
                    <div style={{ width: '164px', flexShrink: 0, minWidth: 0 }} title={h.name ?? h.ticker}>
                      <div className="flex items-center gap-1.5">
                        {isMetal && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />}
                        <p style={{ color: 'var(--color-ink-1)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {primaryLabel}
                        </p>
                      </div>
                      <p className="vq-num" style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                        {secondaryLabel}
                      </p>
                    </div>

                    {/* Allocation bar — flex fills remaining space */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '8px' }}>
                      <div style={{ flex: 1, height: '3px', background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                        <div style={{ width: `${alloc}%`, height: '100%', background: 'var(--color-ink-3)' }} />
                      </div>
                      {/* A share of the portfolio is not a gain — this stays ink. */}
                      <span className="vq-num" style={{ color: 'var(--t2)', fontSize: 'var(--text-sm)', width: '34px', textAlign: 'right', flexShrink: 0 }}>{alloc.toFixed(1)}%</span>
                    </div>

                    {/* Current value — takes the position's direction, so a row
                        can be read as won/lost from the market-value column
                        alone. Cost basis below stays ink on purpose: what you
                        paid is history and cannot itself be a gain or a loss,
                        and colouring it would make every row a wall of green. */}
                    <div style={{ width: '82px', flexShrink: 0, textAlign: 'right' }}>
                      {h.currentValueEur !== null ? (
                        <p className="vq-num" style={{
                          color: h.pnlEur === null ? 'var(--t1)' : isProfit ? 'var(--color-up)' : 'var(--color-down)',
                          fontSize: 'var(--text-base)',
                        }}>{fmtEur(h.currentValueEur)}</p>
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
                            <p className="vq-num" style={{ color: h.change1d >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontSize: 'var(--text-sm)', opacity: 0.8 }}>
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
                        <input type="checkbox" checked={isPicked}
                          onChange={pickRow}
                          onClick={e => e.stopPropagation()}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--re)' }} />
                      </div>
                    ) : h.lots ? (
                      <div className="flex gap-0.5" style={{ width: '36px', flexShrink: 0, justifyContent: 'flex-end' }}>
                        <button onClick={() => toggleExpanded(h.ticker)}
                          aria-expanded={expanded.has(h.ticker)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-ink-3)', cursor: 'pointer', padding: '2px 3px', display: 'flex' }}
                          title={expanded.has(h.ticker) ? 'Hide purchases' : `Show ${h.lots.length} purchases`}>
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                            style={{ transform: expanded.has(h.ticker) ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                            <path d="M3 5.5 8 10.5l5-5" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ width: '36px', flexShrink: 0, justifyContent: 'flex-end' }}>
                        <button onClick={() => h.holding && setModal({ open: true, existing: h.holding })}
                          style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 'var(--text-md)', padding: '2px 3px' }}
                          title="Edit"><Icon name="pencil" size={12} /></button>
                        <button onClick={() => { if (h.holding && confirm(`Remove ${h.ticker}?`)) deleteHolding(h.holding.id) }}
                          style={{ background: 'none', border: 'none', color: 'var(--re)', cursor: 'pointer', fontSize: 'var(--text-md)', padding: '2px 3px' }}
                          title="Remove"><Icon name="close" size={13} /></button>
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
                            {isOver && <span style={{ color: 'var(--color-warn)', display: 'inline-flex' }} title="Over target"><Icon name="alert" size={11} /></span>}
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
              Live market prices · updated every 5 min · EUR/USD live FX · metals priced from futures in USD/troy oz, converted to EUR/gram
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
