'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Candle = { time: number; open: number; high: number; low: number; close: number }

// Reads OHLC bars the EA streamed via the bridge (public.mt5_candles). Returns []
// gracefully when the table/pipeline isn't live yet, so the Trade Map keeps
// working (markers only) and lights up automatically once candles arrive.
export function useCandles(symbol: string, timeframe: string, limit = 800) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) { setCandles([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        const supabase = createClient()
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

    load()
    // Refresh periodically so the current bar keeps up (cheap: one small query).
    const id = setInterval(load, 20_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [symbol, timeframe, limit])

  return { candles, loading }
}
