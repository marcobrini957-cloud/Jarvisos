'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUserProfile } from '@/context/UserProfileContext'
import { useTrades } from '@/hooks/useTrades'
import ProductTour from './ProductTour'

/**
 * Decides whether the tour runs, and gets out of the way if not.
 *
 * Split from ProductTour so the overlay itself has no opinion about eligibility
 * — that keeps "replay from Settings" a matter of clearing two columns rather
 * than of persuading a component to ignore its own guard.
 *
 * Three things have to be true before it starts:
 *  · the profile has actually loaded (the default assumes "already done", so a
 *    returning user never sees a flash of tour while their profile is in flight)
 *  · the tour is not finished and has appeared fewer than SHOW_LIMIT times
 *  · the daily greeting modal is gone — two overlays at once is not a tutorial,
 *    it is a pile-up
 */

const SHOW_LIMIT = 2
const GREETING_KEY = 'vq_greeting_date'

export default function TourHost() {
  const { profile, loading } = useUserProfile()
  const { trades, loading: tradesLoading } = useTrades(1)
  const [running, setRunning] = useState(false)
  const started = useRef(false)

  const eligible =
    !loading &&
    profile.tour_completed_at === null &&
    (profile.tour_shown_count ?? 0) < SHOW_LIMIT

  // Wait for the greeting to be dismissed. It writes today's date to
  // localStorage on close, so that key flipping is the signal — no coupling
  // between the two components beyond a string they both already knew.
  useEffect(() => {
    if (!eligible || started.current) return

    const greetingGone = () =>
      localStorage.getItem(GREETING_KEY) === new Date().toDateString() ||
      localStorage.getItem('vq_greeting_enabled') === 'false'

    const begin = () => {
      if (started.current) return
      started.current = true
      setRunning(true)
      fetch('/api/user/tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'shown' }),
      }).catch(() => {})
    }

    if (greetingGone()) { const t = setTimeout(begin, 700); return () => clearTimeout(t) }

    const iv = setInterval(() => { if (greetingGone()) { clearInterval(iv); begin() } }, 400)
    // Never wait for ever — if the greeting is somehow still up after 30s,
    // start anyway rather than silently never running.
    const bail = setTimeout(() => { clearInterval(iv); begin() }, 30_000)
    return () => { clearInterval(iv); clearTimeout(bail) }
  }, [eligible])

  // Listen for a replay request from Settings.
  useEffect(() => {
    const onReplay = () => { started.current = true; setRunning(true) }
    window.addEventListener('vq-replay-tour', onReplay)
    return () => window.removeEventListener('vq-replay-tour', onReplay)
  }, [])

  const finish = useCallback((completed: boolean) => {
    setRunning(false)
    // Completed and skipped are both "stop showing me this". Someone who closes
    // a tutorial has answered the question it was asking.
    if (completed || (profile.tour_shown_count ?? 0) + 1 >= SHOW_LIMIT) {
      fetch('/api/user/tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'completed' }),
      }).catch(() => {})
    }
  }, [profile.tour_shown_count])

  if (!running || tradesLoading) return null
  return <ProductTour onFinish={finish} isEmptyAccount={trades.length === 0} />
}
