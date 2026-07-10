'use client'
import { useEffect } from 'react'

export default function DevLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    return () => {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = ''
    }
  }, [])

  return <>{children}</>
}
