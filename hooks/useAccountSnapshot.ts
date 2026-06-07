'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AccountSnapshot } from '@/types'

export function useAccountSnapshot() {
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('account_snapshots')
        .select('*')
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .single()
      setSnapshot((data as AccountSnapshot) ?? null)
      setLoading(false)
    }
    load()
  }, [])

  return { snapshot, loading }
}
