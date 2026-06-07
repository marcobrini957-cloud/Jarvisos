'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { JournalEntry } from '@/types'

export function useJournalEntries() {
  const [entries, setEntries]   = useState<JournalEntry[]>([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .limit(90)
    setEntries((data ?? []) as JournalEntry[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addEntry(entry: {
    entry_date: string
    mood: string
    energy_level: number
    body_text: string
    tags: string[]
    is_trading_day: boolean
  }) {
    const supabase = createClient()
    // Upsert by date (one entry per day)
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('entry_date', entry.entry_date)
      .single()

    let saved: JournalEntry | null = null
    if (existing) {
      const { data } = await supabase
        .from('journal_entries')
        .update(entry)
        .eq('id', existing.id)
        .select()
        .single()
      saved = data as JournalEntry
    } else {
      const { data } = await supabase
        .from('journal_entries')
        .insert(entry)
        .select()
        .single()
      saved = data as JournalEntry
    }

    if (saved) {
      setEntries(prev => {
        const filtered = prev.filter(e => e.entry_date !== entry.entry_date)
        return [saved!, ...filtered].sort((a, b) => b.entry_date.localeCompare(a.entry_date))
      })
    }
    return saved
  }

  async function deleteEntry(id: string) {
    const supabase = createClient()
    await supabase.from('journal_entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  // Map of date string → entry for quick lookup
  const byDate = new Map(entries.map(e => [e.entry_date, e]))

  return { entries, loading, byDate, addEntry, deleteEntry, reload: load }
}
