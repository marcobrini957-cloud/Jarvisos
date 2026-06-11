'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types'

export function useTasks(filter?: { dueDate?: string; status?: string }) {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase.from('tasks').select('*').eq('user_id', user.id).order('due_date', { ascending: true })
      if (filter?.dueDate) query = query.eq('due_date', filter.dueDate)
      if (filter?.status)  query = query.eq('status', filter.status)
      const { data } = await query
      setTasks((data ?? []) as Task[])
    } finally {
      setLoading(false)
    }
  }, [filter?.dueDate, filter?.status])

  useEffect(() => { load() }, [load])

  async function toggleTask(id: string, done: boolean) {
    const supabase = createClient()
    await supabase.from('tasks').update({
      status:       done ? 'done' : 'todo',
      completed_at: done ? new Date().toISOString() : null,
    }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: done ? 'done' : 'todo' } : t))
  }

  async function addTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('tasks').insert({ ...task, user_id: user.id }).select().single()
    if (data) setTasks(prev => [...prev, data as Task])
  }

  return { tasks, loading, toggleTask, addTask, reload: load }
}
