'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Candle = { time: number; open: number; high: number; low: number; close: number }

// Reads OHLC bars the EA streamed via the bridge (public.mt5_candles) and then
// keeps them live via a Supabase realtime subscription — the current bar and any
// new bars push instantly the moment the EA restreams. Returns [] gracefully when
// the table/pipeline isn't live yet, so the Trade Map keeps working (markers only)
// and lights up automatically once candles arrive.
export function useCandles(symbol: string, timeframe: string, limit = 800) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) { setCandles([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    const supabase = createClient()

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('mt5_candles')
          .select('ts, open, high, low, close')
          .eq('symbol', symbol)
          .eq('timeframe', timeframe)
          .order('ts', { ascending: true })
          .limit(limit)
        if (cancelled) return
        if (error || !data) { setCandles([]) }
        else {
          setCandles(data.map(r => ({
            time: Number(r.ts), open: r.open, high: r.high, low: r.low, close: r.close,
          })))
        }
      } catch {
        if (!cancelled) setCandles([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Merge one pushed bar: update the matching bar in place, or append a new one.
    const mergeBar = (r: { ts: number; open: number; high: number; low: number; close: number }) => {
      const c: Candle = { time: Number(r.ts), open: r.open, high: r.high, low: r.low, close: r.close }
      setCandles(prev => {
        const i = prev.findIndex(x => x.time === c.time)
        if (i >= 0) { const next = prev.slice(); next[i] = c; return next }
        const next = [...prev, c].sort((a, b) => a.time - b.time)
        return next.length > limit ? next.slice(next.length - limit) : next
      })
    }

    load()

    // Live push: channel name must be UNIQUE per subscription (the browser client
    // is a singleton — reusing a name throws on the second .on() after subscribe).
    const channel = supabase
      .channel(`candles-${symbol}-${timeframe}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mt5_candles', filter: `symbol=eq.${symbol}` },
        (payload) => {
          const n = payload.new as Record<string, unknown> | null
          if (cancelled || !n || n.timeframe !== timeframe) return
          mergeBar(n as unknown as { ts: number; open: number; high: number; low: number; close: number })
        },
      )
      .subscribe()

    // Slow reconcile poll — a safety net if realtime drops or a burst is missed.
    const id = setInterval(load, 30_000)

    return () => {
      cancelled = true
      clearInterval(id)
      supabase.removeChannel(channel)
    }
  }, [symbol, timeframe, limit])

  return { candles, loading }
}
