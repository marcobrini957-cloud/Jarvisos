'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const KEY = 'vq-cookie-consent' // 'all' | 'essential'

export function getCookieConsent(): 'all' | 'essential' | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(KEY)
  return v === 'all' || v === 'essential' ? v : null
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true)
  }, [])

  if (!visible) return null

  const choose = (v: 'all' | 'essential') => {
    localStorage.setItem(KEY, v)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom))', left: '16px', right: '16px',
        zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}
    >
      <div style={{
        pointerEvents: 'auto', maxWidth: '560px', width: '100%',
        background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: '14px',
        padding: '16px 18px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', gap: '12px',
        animation: 'vq-consent-in 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        <style>{`@keyframes vq-consent-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <p style={{ margin: 0, color: 'var(--t2)', fontSize: '13px', lineHeight: 1.6 }}>
          Velquor uses only <strong style={{ color: 'var(--t1)' }}>essential cookies</strong> — your login
          session and this choice. No ads, no tracking. Embedded TradingView market widgets in the
          dashboard may set their own cookies.{' '}
          <Link href="/privacy" style={{ color: 'var(--ac)', textDecoration: 'none' }}>Privacy Policy</Link>
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={() => choose('essential')}
            style={{
              background: 'transparent', border: '1px solid var(--bd2)', color: 'var(--t2)',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Essential only
          </button>
          <button
            onClick={() => choose('all')}
            style={{
              background: 'var(--ac)', border: '1px solid var(--ac)', color: '#06090F',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
