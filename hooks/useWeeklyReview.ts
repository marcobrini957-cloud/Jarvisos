'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface WeeklyReview {
  id: string
  created_at: string
  week_start: string
  overall_mood: string | null
  energy_level: number | null
  wins: string | null
  losses: string | null
  lessons: string | null
  next_week_goals: string | null
  trading_grade: string | null
  life_grade: string | null
  ai_analysis: string | null
  tags: string[] | null
}

// Returns the Monday of the week containing `date`
export function weekStart(date: Date = new Date()): string {
  const d   = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

export function weekLabel(ws: string): string {
  const d   = new Date(ws + 'T00:00:00')
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

export function useWeeklyReview() {
  const [reviews,     setReviews]     = useState<WeeklyReview[]>([])
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('weekly_reviews')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(12)
      setReviews((data ?? []) as WeeklyReview[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveReview(ws: string, fields: Partial<Omit<WeeklyReview, 'id' | 'created_at' | 'week_start'>>) {
    const supabase = createClient()
    const existing = reviews.find(r => r.week_start === ws)

    if (existing) {
      const { data } = await supabase
        .from('weekly_reviews')
        .update(fields)
        .eq('id', existing.id)
        .select().single()
      if (data) setReviews(prev => prev.map(r => r.id === existing.id ? data as WeeklyReview : r))
      return data as WeeklyReview
    } else {
      const { data } = await supabase
        .from('weekly_reviews')
        .insert({ week_start: ws, ...fields })
        .select().single()
      if (data) setReviews(prev => [data as WeeklyReview, ...prev])
      return data as WeeklyReview
    }
  }

  function getReview(ws: string): WeeklyReview | undefined {
    return reviews.find(r => r.week_start === ws)
  }

  return { reviews, loading, saveReview, getReview, reload: load }
}
