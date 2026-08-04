'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTrades } from '@/hooks/useTrades'
import ProductTour from './ProductTour'

/**
 * Runs the tour when it is asked for, and never before.
 *
 * It used to start itself on a new account, once the greeting modal was out of
 * the way. That is what a new user actually met: a modal, then a spotlight
 * walking them past panels that were empty because they had not connected
 * anything yet — a tutorial about our layout when what they needed was a
 * sentence about what to do first. The honest response was Skip, twice, and
 * SHOW_LIMIT made sure it asked exactly twice.
 *
 * First-run is `GettingStarted` on Home now: four steps that read the account,
 * tick themselves as they come true, and disappear when there is nothing left.
 * The tour is still here and still good — as a thing you ask for, from Settings,
 * once you know what the panels are for.
 */

export default function TourHost() {
  const { trades, loading: tradesLoading } = useTrades(1)
  const [running, setRunning] = useState(false)
  const started = useRef(false)

  // Listen for a replay request from Settings.
  useEffect(() => {
    const onReplay = () => { started.current = true; setRunning(true) }
    window.addEventListener('vq-replay-tour', onReplay)
    return () => window.removeEventListener('vq-replay-tour', onReplay)
  }, [])

  const finish = useCallback((completed: boolean) => {
    setRunning(false)
    // Still recorded, so "replay" stays honest about having been seen — but
    // nothing here decides whether it runs any more. Asking is the only trigger.
    if (completed) {
      fetch('/api/user/tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'completed' }),
      }).catch(() => {})
    }
  }, [])

  if (!running || tradesLoading) return null
  return <ProductTour onFinish={finish} isEmptyAccount={trades.length === 0} />
}
