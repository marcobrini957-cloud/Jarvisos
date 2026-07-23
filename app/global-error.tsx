'use client'

import { useEffect } from 'react'

// Root error boundary — replaces the whole document if the layout itself throws,
// so it can't use the app's CSS vars. Kept self-contained and inline.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100vh', background: '#0a0a0a', color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '16px', textAlign: 'center', padding: '24px',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: '#9aa0aa', fontSize: '14px', maxWidth: '380px', margin: 0, lineHeight: 1.6 }}>
          A critical error occurred. Please try again.
        </p>
        <button onClick={reset} style={{
          padding: '11px 18px', background: '#4d8fff', color: '#fff', border: 'none',
          borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>Try again</button>
      </body>
    </html>
  )
}
