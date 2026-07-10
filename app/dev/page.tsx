'use client'
import { useState, useEffect } from 'react'
import DevLogin from './DevLogin'
import DevDashboard from './DevDashboard'

export default function DevPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    // Verify session by hitting the stats endpoint — if 401, not authed
    fetch('/api/dev/stats').then(r => {
      setAuthed(r.ok)
    })
  }, [])

  if (authed === null) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#030508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#00FF85', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: '12px', letterSpacing: '0.1em', opacity: 0.5 }}>
          Initializing...
        </div>
      </div>
    )
  }

  if (!authed) {
    return <DevLogin onSuccess={() => setAuthed(true)} />
  }

  return <DevDashboard />
}
