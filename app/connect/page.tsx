'use client'

/**
 * /connect — the full-page EA setup flow.
 *
 * Reachable from Settings, the onboarding step and any "not connected" nudge,
 * so a user who bails halfway has one URL to come back to. Auth-gated by
 * proxy.ts (not in the public list).
 */

import { useState } from 'react'
import Link from 'next/link'
import EAConnectWizard from '@/components/ea/EAConnectWizard'
import { LogoMark } from '@/components/ui/LogoMark'

export default function ConnectPage() {
  const [connected, setConnected] = useState(false)

  return (
    // the root layout pins body{overflow:hidden} for the app shell, so a
    // standalone page has to own its own scroll container
    <div style={{ height: '100dvh', overflowY: 'auto', background: 'var(--bg)', padding: '32px 20px 64px' }}>
      <div style={{ width: '100%', maxWidth: '620px', margin: '0 auto' }}>

        <header style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <LogoMark size={30} />
            <Link
              href="/dashboard"
              style={{ fontSize: '12px', color: 'var(--t2)', fontWeight: 500 }}
            >
              ← Dashboard
            </Link>
          </div>

          <h1 style={{
            fontSize: '27px', fontWeight: 800, letterSpacing: '-0.03em',
            margin: '0 0 9px', color: 'var(--t1)',
          }}>
            Connect MetaTrader 5
          </h1>
          <p style={{ margin: 0, color: 'var(--t2)', fontSize: '14px', lineHeight: 1.65 }}>
            A small Expert Advisor runs inside your own MT5 and pushes your trades to VELQUOR.
            Nobody gets your broker password, and nothing trades on your behalf. Takes about two minutes.
          </p>
        </header>

        <EAConnectWizard onConnected={() => setConnected(true)} />

        {connected && (
          <Link
            href="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: '18px', padding: '14px', borderRadius: 'var(--r-md)',
              background: 'var(--ac)', color: '#fff',
              fontSize: '14px', fontWeight: 700,
              boxShadow: '0 8px 24px rgba(77,143,255,0.25)',
              animation: 'slide-up 0.3s ease',
            }}
          >
            Open my dashboard →
          </Link>
        )}
      </div>
    </div>
  )
}
