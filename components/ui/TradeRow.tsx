'use client'

import Badge from './Badge'
import { Num } from './vq'
import type { Trade } from '@/types'

interface TradeRowProps {
  trade: Trade
  compact?: boolean
}

function formatPips(pips: number | null): string {
  if (pips === null) return '—'
  return pips > 0 ? `+${pips.toFixed(1)}p` : `${pips.toFixed(1)}p`
}

function formatProfit(usd: number | null): string {
  if (usd === null) return '—'
  return usd >= 0 ? `+$${usd.toFixed(2)}` : `-$${Math.abs(usd).toFixed(2)}`
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Europe/Vienna' })
}

export default function TradeRow({ trade, compact = false }: TradeRowProps) {
  return (
    <div
      className="flex items-center gap-3 group"
      style={{ padding: '7px 14px', borderBottom: '1px solid var(--color-line-1)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-state-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Symbol + direction */}
      <div className="flex items-center gap-2 min-w-[128px]">
        <Num size="sm" tone="neutral">{trade.symbol}</Num>
        <Badge variant={trade.trade_type}>{trade.trade_type}</Badge>
        {trade.screenshot_missing && <Badge variant="screenshot">no shot</Badge>}
      </div>

      {/* Session + date */}
      {!compact && (
        <div className="flex items-center gap-2 min-w-[132px]">
          {trade.session && (
            <Badge variant={trade.session}>
              {trade.session === 'new_york' ? 'NY' : trade.session}
            </Badge>
          )}
          <Num size="xs" tone="muted">
            {formatDate(trade.open_time)} {formatTime(trade.open_time)}
          </Num>
        </div>
      )}

      {/* Setup */}
      {!compact && trade.setup_type && (
        <div className="flex-1 hidden md:flex items-center gap-2" style={{ minWidth: 0 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
            color: 'var(--color-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {trade.setup_type}
          </span>
          {trade.emotion_pre && (
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
              color: 'var(--color-ink-3)',
            }}>
              {trade.emotion_pre}
            </span>
          )}
        </div>
      )}

      {/* P&L */}
      <div className="flex items-center gap-3 ml-auto">
        <Num size="xs" tone="muted">{formatPips(trade.pips)}</Num>
        <Num size="sm" value={trade.net_profit ?? 0} tone="auto">{formatProfit(trade.net_profit)}</Num>
      </div>
    </div>
  )
}
