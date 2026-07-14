'use client'
import { useEffect, useState } from 'react'
import { devLogout } from './actions'
import { LogoMark } from '@/components/ui/LogoMark'
import { MONO, G, R } from './ui'
import { OverviewTab } from './tabs/OverviewTab'
import { UsersTab } from './tabs/UsersTab'
import { BridgeTab } from './tabs/BridgeTab'
import { AuditTab } from './tabs/AuditTab'
import { TodoTab } from './tabs/TodoTab'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'bridge', label: 'Bridge' },
  { id: 'audit', label: 'Audit' },
  { id: 'todo', label: 'To-Do' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function DevDashboard() {
  const [tab, setTab] = useState<TabId>('overview')
  const [, setTick] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#030508', color: '#fff', fontFamily: MONO, overflowY: 'auto' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: '1px solid rgba(0,255,133,0.1)',
        background: 'rgba(0,255,133,0.015)', position: 'sticky', top: 0, zIndex: 10,
        flexWrap: 'wrap', gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LogoMark size={26} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: G, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>VELQUOR</span>
              <span style={{ background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.2)', borderRadius: '4px', padding: '1px 7px', color: G, fontSize: '9px', letterSpacing: '0.08em' }}>ADMIN CONSOLE</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', marginTop: '1px' }}>{dateStr}</div>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? 'rgba(0,255,133,0.1)' : 'transparent',
              border: `1px solid ${tab === t.id ? 'rgba(0,255,133,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '7px', color: tab === t.id ? G : 'rgba(255,255,255,0.35)',
              fontSize: '11px', padding: '7px 16px', cursor: 'pointer', fontFamily: MONO,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: G, fontSize: '18px', fontWeight: 700, letterSpacing: '0.04em' }}>{timeStr}</div>
            <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '9px', marginTop: '1px' }}>Vienna</div>
          </div>
          <button onClick={async () => { await devLogout(); window.location.reload() }} style={{ background: 'rgba(255,51,71,0.06)', border: '1px solid rgba(255,51,71,0.18)', borderRadius: '7px', color: R, fontSize: '11px', padding: '7px 14px', cursor: 'pointer', letterSpacing: '0.05em', fontFamily: MONO }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'bridge' && <BridgeTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'todo' && <TodoTab />}
      </div>
    </div>
  )
}
