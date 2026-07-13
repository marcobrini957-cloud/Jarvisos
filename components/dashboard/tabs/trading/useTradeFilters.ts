'use client'

import { useState } from 'react'
import type { Trade } from '@/types'

export function useTradeFilters(trades: Trade[], pageSize = 10) {
  const [symbolFilter, setSymbolState] = useState('all')
  const [dirFilter,    setDirState]    = useState('all')
  const [page,         setPage]        = useState(0)

  // Changing a filter always resets pagination
  const setSymbol = (s: string) => { setSymbolState(s); setPage(0) }
  const setDir    = (d: string) => { setDirState(d);    setPage(0) }

  const filtered = trades.filter(t => {
    if (symbolFilter === 'XAUUSD' && !t.symbol?.includes('XAU'))  return false
    if (symbolFilter === 'NAS100' && !t.symbol?.includes('NAS') && !t.symbol?.includes('US100')) return false
    if (dirFilter    !== 'all'   && t.trade_type !== dirFilter)    return false
    return true
  })

  const paginated  = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  return { symbolFilter, setSymbol, dirFilter, setDir, page, setPage, filtered, paginated, totalPages }
}
