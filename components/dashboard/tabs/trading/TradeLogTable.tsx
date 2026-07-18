'use client'

import { tradeResult } from '@/hooks/useTrades'
import Panel from '@/components/ui/Panel'
import Badge from '@/components/ui/Badge'
import type { Trade } from '@/types'
import { fmtPnl, fmtPips, fmtDate, fmtTime } from './helpers'
import { useTradeFilters } from './useTradeFilters'

export function TradeLogTable({ trades, loading, onAnnotate, onViewScreenshot }: {
  trades: Trade[]
  loading: boolean
  onAnnotate: (t: Trade) => void
  onViewScreenshot: (url: string) => void
}) {
  const { symbolFilter, setSymbol, dirFilter, setDir, page, setPage, filtered, paginated, totalPages } = useTradeFilters(trades)

  return (

          <Panel title={`Trade Log (${filtered.length})`} noPadding action={
            <div className="flex items-center gap-1.5 flex-wrap">
              {['all','XAUUSD','NAS100'].map(s => (
                <button key={s} onClick={() => { setSymbol(s) }}
                  style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'6px', border:'none', cursor:'pointer',
                    background: symbolFilter===s ? 'var(--ac)' : 'var(--s3)',
                    color:      symbolFilter===s ? 'white'     : 'var(--t2)' }}>
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
              <div style={{ width:'1px', height:'14px', background:'var(--bd2)' }}/>
              {['all','buy','sell'].map(d => (
                <button key={d} onClick={() => { setDir(d) }}
                  style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'6px', border:'none', cursor:'pointer',
                    background: dirFilter===d ? 'var(--ac)' : 'var(--s3)',
                    color:      dirFilter===d ? 'white'     : 'var(--t2)' }}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          }>
            {/* Header — desktop only; mobile rows are self-describing cards */}
            <div className="hidden sm:flex items-center px-4 py-2 gap-3"
              style={{ borderBottom:'1px solid var(--bd)', fontSize:'11px', color:'var(--t3)', letterSpacing:'0.04em' }}>
              <span style={{ minWidth:'80px' }}>PAIR</span>
              <span style={{ minWidth:'90px' }}>SESSION</span>
              <span className="flex-1">SETUP / NOTE</span>
              <span style={{ minWidth:'80px', textAlign:'right' }}>P&L (EUR)</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span style={{ color:'var(--t3)', fontSize:'13px' }}>Loading trades…</span>
              </div>
            ) : paginated.map((trade: Trade) => {
              const result = tradeResult(trade.net_profit ?? 0)
              const rowBg  = result === 'win'  ? 'rgba(99,153,34,0.07)'
                           : result === 'loss' ? 'rgba(226,75,74,0.07)'
                           : 'transparent'
              const hoverBg = result === 'win'  ? 'rgba(99,153,34,0.13)'
                            : result === 'loss' ? 'rgba(226,75,74,0.13)'
                            : 'var(--s3)'
              const resultBadge = (
                <span style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
                  padding: '2px 7px', borderRadius: '4px', flexShrink: 0,
                  background: result === 'win'  ? 'rgba(99,153,34,0.18)'
                            : result === 'loss' ? 'rgba(226,75,74,0.18)'
                            : 'rgba(88,166,255,0.12)',
                  color:      result === 'win'  ? 'var(--gr2)'
                            : result === 'loss' ? 'var(--re)'
                            : 'var(--ac)',
                }}>
                  {result === 'win' ? 'W' : result === 'loss' ? 'L' : 'BE'}
                </span>
              )
              return (
              <div key={trade.id}>

              {/* ── Mobile card: everything fits the viewport, tap to annotate ── */}
              <div
                className="flex sm:hidden flex-col px-4 py-3 gap-1.5"
                style={{ borderBottom:'1px solid var(--bd)', background: rowBg }}
                onClick={() => onAnnotate(trade)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                    <span style={{ color:'var(--t1)', fontWeight:600, fontSize:'13.5px' }}>{trade.symbol}</span>
                    <Badge variant={trade.trade_type as 'buy'|'sell'}>{trade.trade_type.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num" style={{
                      color: result === 'win' ? 'var(--gr2)' : result === 'loss' ? 'var(--re)' : 'var(--ac)',
                      fontWeight: 700, fontSize: '14px', letterSpacing: '-0.02em',
                    }}>
                      {fmtPnl(trade.net_profit)}
                    </span>
                    {resultBadge}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color:'var(--t3)', fontSize:'11px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {fmtDate(trade.open_time)} · {fmtTime(trade.open_time)}
                    {trade.session ? ` · ${trade.session === 'new_york' ? 'NY' : trade.session.charAt(0).toUpperCase() + trade.session.slice(1)}` : ''}
                    {trade.setup_type ? ` · ${trade.setup_type}` : ''}
                  </span>
                  <span style={{ color:'var(--t3)', fontSize:'11px', flexShrink: 0 }}>{fmtPips(trade.pips)}</span>
                </div>
              </div>

              {/* ── Desktop row ── */}
              <div
                className="hidden sm:flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer group"
                style={{ borderBottom:'1px solid var(--bd)', background: rowBg }}
                onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>

                <div className="flex flex-col gap-1" style={{ minWidth:'80px' }}>
                  <span style={{ color:'var(--t1)', fontWeight:500, fontSize:'13px' }}>{trade.symbol}</span>
                  <Badge variant={trade.trade_type as 'buy'|'sell'}>{trade.trade_type.toUpperCase()}</Badge>
                </div>

                <div className="flex flex-col gap-1" style={{ minWidth:'90px' }}>
                  {trade.session && (
                    <Badge variant={trade.session as never}>
                      {trade.session === 'new_york' ? 'NY' : trade.session.charAt(0).toUpperCase() + trade.session.slice(1)}
                    </Badge>
                  )}
                  <span style={{ color:'var(--t3)', fontSize:'11px' }}>
                    {fmtDate(trade.open_time)} · {fmtTime(trade.open_time)}
                  </span>
                </div>

                {/* Screenshot indicator — shown only when screenshot exists, clickable to view */}
                {(trade.screenshot_open_url || trade.screenshot_close_url) ? (
                  <button
                    onClick={e => { e.stopPropagation(); onViewScreenshot(trade.screenshot_open_url || trade.screenshot_close_url || '') }}
                    title="View screenshot"
                    style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)', borderRadius: '4px', cursor: 'pointer', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ac)', flexShrink: 0, padding: '2px 4px', lineHeight: 1.2, opacity: 0.8 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
                  >
                    IMG
                  </button>
                ) : (
                  <span style={{ width: '22px', flexShrink: 0 }} />
                )}

                <div className="flex-1">
                  <span style={{ color:'var(--t2)', fontSize:'12px' }}>
                    {trade.setup_type ?? trade.notes ?? '—'}
                  </span>
                  {trade.emotion_pre && (
                    <span style={{ color:'var(--t3)', fontSize:'11px', marginLeft:'8px' }}>{trade.emotion_pre}</span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span className="num" style={{
                    color:      result === 'win' ? 'var(--gr2)' : result === 'loss' ? 'var(--re)' : 'var(--ac)',
                    fontWeight: 700,
                    fontSize:   '14px',
                    letterSpacing: '-0.02em',
                  }}>
                    {fmtPnl(trade.net_profit)}
                  </span>
                  <span style={{ color:'var(--t3)', fontSize:'11px' }}>{fmtPips(trade.pips)}</span>
                </div>

                {resultBadge}

                {/* Pencil — annotate */}
                <button
                  onClick={e => { e.stopPropagation(); onAnnotate(trade) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Annotate trade"
                  style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:'16px', padding:'2px 4px', lineHeight:1 }}>
                  ✎
                </button>
              </div>

              </div>
            )})}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop:'1px solid var(--bd)' }}>
                <button disabled={page===0} onClick={() => setPage(p=>p-1)}
                  style={{ fontSize:'12px', color: page===0?'var(--t3)':'var(--ac)', background:'none', border:'none', cursor:page===0?'default':'pointer' }}>
                  ← Prev
                </button>
                <span style={{ color:'var(--t3)', fontSize:'12px' }}>{page+1} / {totalPages}</span>
                <button disabled={page>=totalPages-1} onClick={() => setPage(p=>p+1)}
                  style={{ fontSize:'12px', color: page>=totalPages-1?'var(--t3)':'var(--ac)', background:'none', border:'none', cursor:page>=totalPages-1?'default':'pointer' }}>
                  Next →
                </button>
              </div>
            )}
          </Panel>
  )
}
