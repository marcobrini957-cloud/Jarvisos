'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { CopyGroup } from './copy/types'
import { CreateGroupModal } from './copy/CreateGroupModal'
import { GroupCard, type CloudInfo } from './copy/GroupCard'
import { PlanGateBanner } from './copy/PlanGateBanner'
import { HowItWorks } from './copy/HowItWorks'

// ── Main Tab ──────────────────────────────────────────────────────────────────
export default function CopyTradingTab() {
  const [groups,          setGroups]          = useState<CopyGroup[]>([])
  const [cloud,           setCloud]           = useState<CloudInfo>({ hostedIds: [], mainLogin: null })
  const [loading,         setLoading]         = useState(true)
  const [tier,            setTier]            = useState<string>('free')
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  // Single fetch: sets groups + derives tier from response status
  const load = useCallback(async () => {
    const [res, cloudRes] = await Promise.all([
      fetch('/api/copy/groups'),
      fetch('/api/copy/cloud-status').catch(() => null),
    ])
    if (cloudRes?.ok) {
      const c = await cloudRes.json()
      setCloud({
        hostedIds: c.hosted_account_ids ?? [],
        mainLogin: c.main_terminal?.login != null ? String(c.main_terminal.login) : null,
      })
    }
    if (res.status === 401) { setLoading(false); return }
    if (res.status === 403) { setTier('free'); setLoading(false); return }
    if (res.ok) {
      const data = await res.json()
      setTier('pro')
      setGroups(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [load])

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t3)', fontSize: 'var(--text-base)' }}>
        Loading…
      </div>
    )
  }

  return (
    // No extra padding or overflow here — DashboardShell's <main> handles both
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--t1)' }}>Copy Trading</div>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--t3)', marginTop: '4px' }}>
            Mirror trades across multiple MT5 accounts in real time
          </div>
        </div>
        {tier !== 'free' && (
          <button
            onClick={() => setShowCreateGroup(true)}
            style={{
              padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-base)', fontWeight: 600,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              color: 'var(--ac)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            + New Group
          </button>
        )}
      </div>

      {tier === 'free' ? (
        <PlanGateBanner />
      ) : (
        <>
          {groups.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 20px',
              background: 'var(--s1)', border: '1px dashed var(--bd)', borderRadius: 'var(--radius-xl)',
            }}>
              <div style={{ fontSize: 'var(--text-3xl)', marginBottom: '12px' }}>⚡</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '8px' }}>
                No copy groups yet
              </div>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--t3)', marginBottom: '20px' }}>
                Create your first group to start mirroring trades
              </div>
              <button
                onClick={() => setShowCreateGroup(true)}
                style={{
                  padding: '10px 24px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-base)', fontWeight: 600,
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                  color: 'var(--ac)', cursor: 'pointer',
                }}
              >
                Create Copy Group
              </button>
            </div>
          ) : (
            groups.map(g => <GroupCard key={g.id} group={g} cloud={cloud} onRefresh={load} />)
          )}

          <HowItWorks />
        </>
      )}

      {/* MT5 URL whitelist reminder — only relevant for own-MetaTrader (EA) accounts */}
      <div style={{
        marginTop: '20px', padding: '10px 16px', borderRadius: 'var(--radius-md)',
        background: 'var(--s1)', border: '1px solid var(--bd)',
        fontSize: 'var(--text-sm)', color: 'var(--t3)', lineHeight: 1.6, opacity: 0.85,
      }}>
        Running the EA on your own MetaTrader? Add{' '}
        <code style={{ color: 'var(--color-ink-1)', background: 'var(--s2)', padding: '1px 6px', borderRadius: 'var(--radius-sm)' }}>
          https://bridge.velquor.app
        </code>
        {' '}under <em>Tools → Options → Expert Advisors → Allow WebRequest</em>. Cloud-hosted accounts need no setup.
        {' '}<Link href="/connect" style={{ color: 'var(--ac)', fontWeight: 600 }}>Step-by-step guide →</Link>
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => { setShowCreateGroup(false); load() }}
        />
      )}
    </div>
  )
}
