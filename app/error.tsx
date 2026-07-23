'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '18px', textAlign: 'center', padding: '24px',
    }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
      <p style={{ color: 'var(--t3)', fontSize: '14px', maxWidth: '380px', margin: 0, lineHeight: 1.6 }}>
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={reset} style={{
          padding: '11px 18px', background: 'var(--ac)', color: '#fff', border: 'none',
          borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>Try again</button>
        <Link href="/" style={{
          padding: '11px 18px', background: 'var(--s2)', color: 'var(--t1)',
          borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
        }}>Home</Link>
      </div>
    </div>
  )
}
