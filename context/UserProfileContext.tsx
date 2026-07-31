'use client'

import { useMemo, createContext, useContext, useState, useCallback, useEffect } from 'react'
import { BE_PIPS, makeClassifier, type Classifier } from '@/lib/trading/stats'

export type Tier = 'free' | 'pro' | 'ultra'

export interface UserProfile {
  display_name:  string
  avatar_color:  string
  avatar_url:    string | null
  timezone:      string
  currency:      string
  tier:          Tier
  /** Pips of movement below which a trade is a scratch. See lib/trading/stats. */
  be_pips:       number
}

const DEFAULT_PROFILE: UserProfile = {
  display_name:  'Trader',
  avatar_color:  'var(--ac)',
  avatar_url:    null,
  timezone:      'Europe/Vienna',
  currency:      'EUR',
  tier:          'free',
  be_pips:       BE_PIPS,
}

interface UserProfileContextValue {
  profile:       UserProfile
  loading:       boolean
  updateProfile: (partial: Partial<UserProfile>) => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profile:       DEFAULT_PROFILE,
  loading:       true,
  updateProfile: async () => {},
})

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/profile', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: UserProfile) => {
        if (data && data.display_name) setProfile({ ...DEFAULT_PROFILE, ...data })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateProfile = useCallback(async (partial: Partial<UserProfile>) => {
    const optimistic = { ...profile, ...partial }
    setProfile(optimistic)
    try {
      const res  = await fetch('/api/user/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(partial),
      })
      const data = await res.json() as UserProfile
      // PATCH doesn't echo tier — keep the resolved tier from the current profile.
      if (res.ok && data.display_name) setProfile(prev => ({ ...prev, ...data, tier: prev.tier }))
    } catch {
      // Keep optimistic update
    }
  }, [profile])

  return (
    <UserProfileContext.Provider value={{ profile, loading, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  return useContext(UserProfileContext)
}

/**
 * Win/loss/scratch predicates bound to this user's break-even distance.
 *
 * Components should reach for this rather than importing the bare `isWin` /
 * `isLoss`, which are fixed to the default threshold — otherwise a user who
 * moves the setting sees their calendar and their win rate disagree.
 */
export function useClassifier(): Classifier {
  const { profile } = useUserProfile()
  return useMemo(() => makeClassifier(profile.be_pips), [profile.be_pips])
}
