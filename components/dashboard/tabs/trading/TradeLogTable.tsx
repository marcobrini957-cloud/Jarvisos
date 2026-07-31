'use client'

import Panel from '@/components/ui/Panel'
import Badge from '@/components/ui/Badge'
import { Label, Num, Segmented } from '@/components/ui/vq'
import type { Trade } from '@/types'
import { fmtPnl, fmtPips, fmtDate, fmtTime } from './helpers'
import { useTradeFilters } from './useTradeFilters'
import Icon from '@/components/ui/Icon'
import { useClassifier } from '@/context/UserProfileContext'

/** Outcome marker. W / L / BE, coloured by outcome — the row's only chroma. */
function ResultMark({ result }: { result: 'win' | 'loss' | 'breakeven' }) {
  return (
    <span style={{
      fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
      letterSpacing: '0.1em', padding: '1px 5px', borderRadius: 'var(--radius-xs)',
      flexShrink: 0, minWidth: '24px', textAlign: 'center',
      background: result === 'win'  ? 'var(--color-up-dim)'
                : result === 'loss' ? 'var(--color-down-dim)'
                : 'var(--color-surface-2)',
      color:      result === 'win'  ? 'var(--color-up)'
                : result === 'loss' ? 'var(--color-down)'
                : 'var(--color-ink-2)',
    }}>
      {result === 'win' ? 'W' : result === 'loss' ? 'L' : 'BE'}
    </span>
  )
}

export function TradeLogTable({ trades, loading, onAnnotate, onViewScreenshot }: {
  trades: Trade[]
  loading: boolean
  onAnnotate: (t: Trade) => void
  onViewScreenshot: (url: string) => void
}) {
  const { tradeResult } = useClassifier()
  const { symbolFilter, setSymbol, dirFilter, setDir, page, setPage, filtered, paginated, totalPages } = useTradeFilters(trades)

  return (
    <Panel title={`Trade log (${filtered.length})`} noPadding action={
      <div className="flex items-center gap-2 flex-wrap">
        <Segmented
          options={[{ key: 'all', label: 'All' }, { key: 'XAUUSD', label: 'XAUUSD' }, { key: 'NAS100', label: 'NAS100' }]}
          value={symbolFilter}
          onChange={setSymbol}
        />
        <Segmented
          options={[{ key: 'all', label: 'All' }, { key: 'buy', label: 'Buy' }, { key: 'sell', label: 'Sell' }]}
          value={dirFilter}
          onChange={setDir}
        />
      </div>
    }>
      {/* Header — desktop only; mobile rows are self-describing cards */}
      <div className="hidden sm:flex items-center gap-3"
        style={{ padding: '6px 14px', borderBottom: '1px solid var(--color-line-1)' }}>
        <span style={{ minWidth: '112px' }}><Label>Pair</Label></span>
        <span style={{ minWidth: '128px' }}><Label>Session</Label></span>
        <span style={{ width: '26px' }} />
        <span className="flex-1"><Label>Setup / note</Label></span>
        <span style={{ minWidth: '92px', textAlign: 'right' }}><Label>P&L</Label></span>
        <span style={{ width: '24px' }} />
        <span style={{ width: '22px' }} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: '22px' }}>
          <Label>Loading trades</Label>
        </div>
      ) : paginated.map((trade: Trade) => {
        const result = tradeResult(trade)
        // Row tint carries the outcome at a glance; kept at 5% so a full page of
        // trades still reads as a table and not as two blocks of colour.
        const rowBg  = result === 'win'  ? 'rgba(0,196,106,0.05)'
                     : result === 'loss' ? 'rgba(240,80,75,0.05)'
                     : 'transparent'
        const hoverBg = result === 'win'  ? 'rgba(0,196,106,0.10)'
                      : result === 'loss' ? 'rgba(240,80,75,0.10)'
                      : 'var(--color-state-hover)'
        return (
        <div key={trade.id}>

          {/* ── Mobile card: everything fits the viewport, tap to annotate ── */}
          <div
            className="flex sm:hidden flex-col gap-1.5"
            style={{ padding: '9px 12px', borderBottom: '1px solid var(--color-line-1)', background: rowBg }}
            onClick={() => onAnnotate(trade)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                <Num size="sm" tone="neutral">{trade.symbol}</Num>
                <Badge variant={trade.trade_type as 'buy'|'sell'}>{trade.trade_type}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Num size="md" value={trade.net_profit ?? 0} tone={result === 'breakeven' ? 'neutral' : 'auto'}>
                  {fmtPnl(trade.net_profit)}
                </Num>
                <ResultMark result={result} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Num size="xs" tone="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fmtDate(trade.open_time)} · {fmtTime(trade.open_time)}
                {trade.session ? ` · ${trade.session === 'new_york' ? 'NY' : trade.session}` : ''}
                {trade.setup_type ? ` · ${trade.setup_type}` : ''}
              </Num>
              <Num size="xs" tone="muted" style={{ flexShrink: 0 }}>{fmtPips(trade.pips)}</Num>
            </div>
          </div>

          {/* ── Desktop row — click anywhere to annotate (pen is just a hint) ── */}
          <div
            className="hidden sm:flex items-center gap-3 transition-colors cursor-pointer group"
            style={{ padding: '6px 14px', borderBottom: '1px solid var(--color-line-1)', background: rowBg }}
            onClick={() => onAnnotate(trade)}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>

            <div className="flex items-center gap-2" style={{ minWidth: '112px' }}>
              <Num size="sm" tone="neutral">{trade.symbol}</Num>
              <Badge variant={trade.trade_type as 'buy'|'sell'}>{trade.trade_type}</Badge>
            </div>

            <div className="flex items-center gap-2" style={{ minWidth: '128px' }}>
              {trade.session && (
                <Badge variant={trade.session as never}>
                  {trade.session === 'new_york' ? 'NY' : trade.session}
                </Badge>
              )}
              <Num size="2xs" tone="muted">
                {fmtDate(trade.open_time)} {fmtTime(trade.open_time)}
              </Num>
            </div>

            {/* Screenshot indicator — shown only when a shot exists, clickable to
                view. Close shot first: it has entry AND exit marked. */}
            {(trade.screenshot_close_url || trade.screenshot_open_url || trade.screenshot_user_url) ? (
              <button
                onClick={e => { e.stopPropagation(); onViewScreenshot(trade.screenshot_close_url || trade.screenshot_open_url || trade.screenshot_user_url || '') }}
                title="View screenshot"
                style={{
                  background: 'var(--color-surface-2)', border: 'none',
                  borderRadius: 'var(--radius-xs)', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                  letterSpacing: '0.1em', color: 'var(--color-ink-2)',
                  flexShrink: 0, width: '26px', padding: '1px 0', lineHeight: 1.3,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-ink-2)')}
              >
                IMG
              </button>
            ) : (
              <span style={{ width: '26px', flexShrink: 0 }} />
            )}

            <div className="flex-1 flex items-center gap-2" style={{ minWidth: 0 }}>
              <span style={{
                color: 'var(--color-ink-2)', fontSize: 'var(--text-base)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {trade.setup_type ?? trade.notes ?? '—'}
              </span>
              {trade.emotion_pre && (
                <span style={{ color: 'var(--color-ink-3)', fontSize: 'var(--text-xs)' }}>{trade.emotion_pre}</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3" style={{ minWidth: '92px' }}>
              <Num size="2xs" tone="muted">{fmtPips(trade.pips)}</Num>
              <Num size="sm" value={trade.net_profit ?? 0} tone={result === 'breakeven' ? 'neutral' : 'auto'}>
                {fmtPnl(trade.net_profit)}
              </Num>
            </div>

            <ResultMark result={result} />

            {/* Pencil — annotate */}
            <button
              onClick={e => { e.stopPropagation(); onAnnotate(trade) }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Annotate trade"
              style={{ background: 'none', border: 'none', color: 'var(--color-ink-3)', cursor: 'pointer', fontSize: 'var(--text-md)', padding: '0 2px', lineHeight: 1, width: '22px' }}>
              <Icon name="pencil" size={12} />
            </button>
          </div>

        </div>
      )})}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between" style={{ padding: '7px 14px', borderTop: '1px solid var(--color-line-1)' }}>
          <button disabled={page===0} onClick={() => setPage(p=>p-1)}
            style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: page===0 ? 'var(--color-ink-4)' : 'var(--color-ink-1)', background: 'none', border: 'none', cursor: page===0 ? 'default' : 'pointer' }}>
            ← Prev
          </button>
          <Num size="xs" tone="muted">{page+1} / {totalPages}</Num>
          <button disabled={page>=totalPages-1} onClick={() => setPage(p=>p+1)}
            style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: page>=totalPages-1 ? 'var(--color-ink-4)' : 'var(--color-ink-1)', background: 'none', border: 'none', cursor: page>=totalPages-1 ? 'default' : 'pointer' }}>
            Next →
          </button>
        </div>
      )}
    </Panel>
  )
}
