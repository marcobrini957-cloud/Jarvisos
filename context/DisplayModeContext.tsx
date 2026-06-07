'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type DisplayMode = 'eur' | 'pct'

interface DisplayModeContextValue {
  displayMode:      DisplayMode
  toggleDisplayMode: () => void
}

const DisplayModeContext = createContext<DisplayModeContextValue>({
  displayMode:       'pct',
  toggleDisplayMode: () => {},
})

export function DisplayModeProvider({ children }: { children: React.ReactNode }) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('pct')

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode(m => m === 'pct' ? 'eur' : 'pct')
  }, [])

  return (
    <DisplayModeContext.Provider value={{ displayMode, toggleDisplayMode }}>
      {children}
    </DisplayModeContext.Provider>
  )
}

export function useDisplayMode() {
  return useContext(DisplayModeContext)
}
