'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Habit {
  id: string
  name: string
  icon: string
  category: string
  is_active: boolean
  sort_order: number
}

export interface HabitCompletion {
  id: string
  habit_id: string
  completed_date: string
}

export function useHabits() {
  const [habits,      setHabits]      = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [{ data: h }, { data: c }] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('sort_order'),
        supabase.from('habit_completions').select('*').eq('user_id', user.id).gte('completed_date', since),
      ])

      setHabits((h ?? []) as Habit[])
      setCompletions((c ?? []) as HabitCompletion[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]

  function isCompleted(habitId: string, date: string = today): boolean {
    return completions.some(c => c.habit_id === habitId && c.completed_date === date)
  }

  async function toggleHabit(habitId: string, date: string = today) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const done = isCompleted(habitId, date)

    if (done) {
      await supabase.from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_date', date)
        .eq('user_id', user.id)
      setCompletions(prev => prev.filter(c => !(c.habit_id === habitId && c.completed_date === date)))
    } else {
      const { data } = await supabase.from('habit_completions')
        .insert({ habit_id: habitId, completed_date: date, user_id: user.id })
        .select().single()
      if (data) setCompletions(prev => [...prev, data as HabitCompletion])
    }
  }

  async function addHabit(name: string, icon: string, category: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const sort_order = habits.length + 1
    const { data }   = await supabase
      .from('habits')
      .insert({ name, icon, category, is_active: true, sort_order, user_id: user.id })
      .select().single()
    if (data) setHabits(prev => [...prev, data as Habit])
  }

  async function deleteHabit(id: string) {
    const supabase = createClient()
    await supabase.from('habits').update({ is_active: false }).eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  function calcStreak(habitId: string): number {
    const dates = new Set(
      completions.filter(c => c.habit_id === habitId).map(c => c.completed_date)
    )
    let streak = 0
    const d = new Date()
    // If today isn't done yet, start counting from yesterday so a live streak isn't broken
    if (!dates.has(d.toISOString().split('T')[0])) {
      d.setDate(d.getDate() - 1)
    }
    while (true) {
      const dateStr = d.toISOString().split('T')[0]
      if (!dates.has(dateStr)) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }

  const todayCompleted = habits.filter(h => isCompleted(h.id, today)).length
  const todayTotal     = habits.length

  function completionRate(habitId: string): number {
    const count = completions.filter(c => c.habit_id === habitId).length
    return habits.length > 0 ? Math.round((count / 30) * 100) : 0
  }

  return {
    habits, completions, loading,
    today, isCompleted, toggleHabit,
    addHabit, deleteHabit,
    calcStreak, completionRate,
    todayCompleted, todayTotal,
  }
}
