'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PortfolioHolding } from '@/types'
import { valueHolding, portfolioTotals } from '@/lib/portfolio/valuation'

const TROY_OZ_TO_GRAMS = 31.1034768

export interface HoldingWithPrice extends PortfolioHolding {
  currentPrice:    number | null
  currentPriceEur: number | null   // EUR/share for stocks, EUR/gram for metals
  prevCloseEur:    number | null
  change1d:        number | null   // %
  marketState:     string | null
  currentValueEur: number | null
  pnlEur:          number | null
  pnlPct:          number | null
  costBasisEur:    number | null
}

interface MetalPriceData {
  priceUsdPerOz:   number
  priceEurPerOz:   number
  priceEurPerGram: number
  changePct:       number
}

export function usePortfolio() {
  const [holdings,     setHoldings]   = useState<HoldingWithPrice[]>([])
  const [loading,      setLoading]    = useState(true)
  const [priceLoading, setPL]         = useState(false)
  const [priceError,   setPriceError] = useState<string | null>(null)
  const [eurUsdRate,   setEurUsd]     = useState(1.08)

  const loadHoldings = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('portfolio_holdings')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    const rows = (data ?? []) as PortfolioHolding[]
    const enriched: HoldingWithPrice[] = rows.map(h => ({
      ...h,
      currentPrice: null, currentPriceEur: null, prevCloseEur: null,
      change1d: null, marketState: null,
      currentValueEur: null, pnlEur: null, pnlPct: null,
      // avg_buy_price is always in EUR (entered via Trade Republic / our form)
      costBasisEur: h.avg_buy_price ? h.quantity * h.avg_buy_price : null,
    }))
    setHoldings(enriched)
    setLoading(false)
    if (rows.length > 0) fetchPrices(rows)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchPrices(rows: PortfolioHolding[]) {
    setPL(true)
    setPriceError(null)
    try {
      const metals    = rows.filter(h => h.asset_type === 'metal')
      const nonMetals = rows.filter(h => h.asset_type !== 'metal')

      // ── Stock / ETF / Crypto prices via Yahoo Finance ─────────────────────
      if (nonMetals.length > 0) {
        const tickers = nonMetals.map(h => h.ticker).join(',')
        const res = await fetch(`/api/portfolio/prices?tickers=${tickers}`)
        if (res.ok) {
          const { quotes, eurUsdRate: fx } = await res.json()
          setEurUsd(fx ?? 1.08)

          setHoldings(prev => prev.map(h => {
            if (h.asset_type === 'metal') return h
            const q = quotes?.find((q: { ticker: string }) => q.ticker === h.ticker)
            if (!q) return h

            // Only the live market price from Yahoo needs FX conversion (handled by the API)
            return {
              ...h,
              currentPrice:    q.price,
              currentPriceEur: q.priceEur,
              prevCloseEur:    q.prevCloseEur,
              change1d:        q.change1d,
              marketState:     q.marketState,
              ...valueHolding(h, q.priceEur),
            }
          }))
        }
      }

      // ── Metal prices via gold-api.com ─────────────────────────────────────
      if (metals.length > 0) {
        const res = await fetch('/api/metals/prices')
        if (res.ok) {
          const metalData = await res.json() as Record<string, MetalPriceData>

          setHoldings(prev => prev.map(h => {
            if (h.asset_type !== 'metal') return h
            const mp = metalData[h.ticker]
            if (!mp) return h

            return {
              ...h,
              currentPrice:    mp.priceUsdPerOz,
              currentPriceEur: mp.priceEurPerGram,
              prevCloseEur:    null,
              change1d:        mp.changePct,
              marketState:     null,
              ...valueHolding(h, mp.priceEurPerGram),  // grams × EUR/gram
            }
          }))
        }
      }
    } catch (err) {
      setPriceError(err instanceof Error ? err.message : 'Failed to load prices')
    } finally {
      setPL(false)
    }
  }

  useEffect(() => { loadHoldings() }, [loadHoldings])

  // Refresh prices every 5 minutes
  useEffect(() => {
    const id = setInterval(() => {
      const supabase = createClient()
      supabase.from('portfolio_holdings').select('*').eq('is_active', true).then(({ data }) => {
        if (data && data.length > 0) fetchPrices(data as PortfolioHolding[])
      })
    }, 300_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addHolding(h: {
    ticker: string; name: string; asset_type: string
    quantity: number; avg_buy_price: number; currency: string
    sector?: string; notes?: string; target_pct?: number
  }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('portfolio_holdings').insert({ ...h, is_active: true, user_id: user.id }).select().single()
    if (data) await loadHoldings()
    return data
  }

  async function updateHolding(id: string, updates: Partial<PortfolioHolding>) {
    const supabase = createClient()
    await supabase.from('portfolio_holdings').update(updates).eq('id', id)
    await loadHoldings()
  }

  async function deleteHolding(id: string) {
    const supabase = createClient()
    await supabase.from('portfolio_holdings').update({ is_active: false }).eq('id', id)
    setHoldings(prev => prev.filter(h => h.id !== id))
  }

  const { totalValueEur, totalCostEur, totalPnlEur, totalPnlPct } = portfolioTotals(holdings)

  return {
    holdings, loading, priceLoading, priceError, eurUsdRate,
    totalValueEur, totalCostEur, totalPnlEur, totalPnlPct,
    addHolding, updateHolding, deleteHolding, reload: loadHoldings,
  }
}
