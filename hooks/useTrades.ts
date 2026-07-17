'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trade } from '@/types'
import { computeStats, isRealTrade, type TradeStats } from '@/lib/trading/stats'

// Re-exported so existing imports from '@/hooks/useTrades' keep working
export { BE_THRESHOLD, tradeResult, computeStats, isRealTrade } from '@/lib/trading/stats'
export type { TradeStats } from '@/lib/trading/stats'



export function useTrades(limit = 50) {
  const [trades,        setTrades]        = useState<Trade[]>([])
  const [allRows,       setAllRows]       = useState<Trade[]>([])
  const [openPositions, setOpenPositions] = useState<Trade[]>([])
  const [stats,         setStats]         = useState<TradeStats | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const initialized = useRef(false)

  const load = useCallback(async () => {
    // Only show loading spinner on the very first fetch.
    // Background refreshes (poll, realtime, mt5-synced) update silently.
    if (!initialized.current) setLoading(true)
    try {
      const supabase = createClient()

      // Fetch closed rows + open positions in parallel
      const [closedRes, openRes] = await Promise.all([
        supabase
          .from('trades')
          .select('*')
          .eq('status', 'closed')
          .order('close_time', { ascending: false })
          .limit(limit),
        supabase
          .from('trades')
          .select('*')
          .eq('status', 'open')
          .order('open_time', { ascending: false }),
      ])

      if (closedRes.error) throw closedRes.error

      const rows = (closedRes.data ?? []) as Trade[]
      setTrades(rows.filter(isRealTrade))
      setAllRows(rows)
      setStats(computeStats(rows))
      setOpenPositions((openRes.data ?? []).filter(isRealTrade) as Trade[])
      initialized.current = true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { load() }, [load])

  // Realtime subscription — instantly reflects any DB insert/update on the trades table.
  // Channel name must be unique per hook instance: the browser client is a singleton,
  // so a shared name returns the already-subscribed channel and .on() throws
  // ("cannot add postgres_changes callbacks after subscribe()") when two consumers
  // overlap — e.g. OverviewTab unmounting while MobileOverviewTab mounts on phones.
  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase
      .channel(`trades-realtime-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => {
        load()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  // Also reload on manual mt5-synced event (belt-and-suspenders)
  useEffect(() => {
    const handler = () => load()
    window.addEventListener('mt5-synced', handler)
    return () => window.removeEventListener('mt5-synced', handler)
  }, [load])

  return { trades, allRows, openPositions, stats, loading, error, reload: load }
}

