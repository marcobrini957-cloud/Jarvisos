'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

export interface UserProfile {
  display_name:  string
  avatar_color:  string
  avatar_emoji:  string | null
  timezone:      string
  currency:      string
}

const DEFAULT_PROFILE: UserProfile = {
  display_name:  'Trader',
  avatar_color:  'var(--ac)',
  avatar_emoji:  null,
  timezone:      'Europe/Vienna',
  currency:      'EUR',
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
    fetch('/api/user/profile')
      .then(r => r.json())
      .then((data: UserProfile) => {
        if (data && data.display_name) setProfile(data)
      })
      .catch(() => { /* use defaults on error */ })
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
      if (res.ok && data.display_name) setProfile(data)
    } catch {
      // Keep optimistic update; silently fail
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
