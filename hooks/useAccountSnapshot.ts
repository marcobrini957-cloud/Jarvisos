'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AccountSnapshot } from '@/types'

export function useAccountSnapshot() {
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null)
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('account_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .single()
    setSnapshot((data as AccountSnapshot) ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Refresh after MT5 sync
    const handler = () => load()
    window.addEventListener('mt5-synced', handler)
    return () => window.removeEventListener('mt5-synced', handler)
  }, [load])

  return { snapshot, loading }
}
