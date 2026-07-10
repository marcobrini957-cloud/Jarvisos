'use client'
import { useEffect } from 'react'

export default function DevLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const b = document.body
    const h = document.documentElement
    b.style.overflow = 'auto'
    b.style.height = 'auto'
    h.style.overflow = 'auto'
    h.style.height = 'auto'
    return () => {
      b.style.overflow = 'hidden'
      b.style.height = ''
      h.style.overflow = ''
      h.style.height = ''
    }
  }, [])

  return <>{children}</>
}
