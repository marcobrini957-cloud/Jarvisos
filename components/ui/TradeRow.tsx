'use client'

import Badge from './Badge'
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
  const isProfit = (trade.net_profit ?? 0) >= 0

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer group"
      style={{ borderBottom: '1px solid var(--bd)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s3)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Symbol + Direction */}
      <div className="flex flex-col gap-1 min-w-[80px]">
        <span style={{ color: 'var(--t1)', fontWeight: 500, fontSize: '13px' }}>
          {trade.symbol}
        </span>
        <div className="flex items-center gap-1">
          <Badge variant={trade.trade_type}>{trade.trade_type.toUpperCase()}</Badge>
          {trade.screenshot_missing && (
            <Badge variant="screenshot">no screenshot</Badge>
          )}
        </div>
      </div>

      {/* Session + Date */}
      {!compact && (
        <div className="flex flex-col gap-1 min-w-[90px]">
          {trade.session && (
            <Badge variant={trade.session}>
              {trade.session === 'new_york' ? 'NY' : trade.session.charAt(0).toUpperCase() + trade.session.slice(1)}
            </Badge>
          )}
          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
            {formatDate(trade.open_time)} · {formatTime(trade.open_time)}
          </span>
        </div>
      )}

      {/* Setup */}
      {!compact && trade.setup_type && (
        <div className="flex-1 hidden md:block">
          <span style={{ color: 'var(--t2)', fontSize: '12px' }}>
            {trade.setup_type}
          </span>
          {trade.emotion_pre && (
            <span style={{ color: 'var(--t3)', fontSize: '11px', marginLeft: '8px' }}>
              {trade.emotion_pre}
            </span>
          )}
        </div>
      )}

      {/* P&L */}
      <div className="flex flex-col items-end gap-1 ml-auto">
        <span style={{ color: isProfit ? 'var(--gr2)' : 'var(--re)', fontWeight: 500, fontSize: '13px' }}>
          {formatProfit(trade.net_profit)}
        </span>
        <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
          {formatPips(trade.pips)}
        </span>
      </div>
    </div>
  )
}
