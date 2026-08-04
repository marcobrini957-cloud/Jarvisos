'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { Button } from '@/components/ui/vq'
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
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-ink-3)', fontSize: 'var(--text-base)' }}>
        Loading…
      </div>
    )
  }

  return (
    // No extra padding or overflow here — DashboardShell's <main> handles both
    <div style={{ maxWidth: '1100px' }}>

      {/* Header. The section is named "Copy" in the header above this and in the
          sidebar beside it; a third title saying it again is one heading too
          many. What is left is the line that actually explains the section. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-3)' }}>
          Mirror trades across multiple MT5 accounts in real time
        </div>
        {tier !== 'free' && (
          <Button variant="primary" onClick={() => setShowCreateGroup(true)} style={{ flexShrink: 0 }}>
            <Icon name="plus" size={13} /> New group
          </Button>
        )}
      </div>

      {tier === 'free' ? (
        <PlanGateBanner />
      ) : (
        <>
          {groups.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 20px',
              background: 'var(--color-surface-1)', border: '1px dashed var(--color-line-2)', borderRadius: 'var(--radius-card)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', color: 'var(--color-ink-1)', marginBottom: '8px' }}>
                No copy groups yet
              </div>
              <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-3)', marginBottom: '20px' }}>
                Create your first group to start mirroring trades
              </div>
              <Button variant="primary" onClick={() => setShowCreateGroup(true)}>
                Create copy group
              </Button>
            </div>
          ) : (
            groups.map(g => <GroupCard key={g.id} group={g} cloud={cloud} onRefresh={load} />)
          )}

          <HowItWorks />
        </>
      )}

      {/* MT5 URL whitelist reminder — only relevant for own-MetaTrader (EA) accounts */}
      <div style={{
        marginTop: '12px', padding: '10px 16px', borderRadius: 'var(--radius-card)',
        background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
        fontSize: 'var(--text-sm)', color: 'var(--color-ink-3)', lineHeight: 1.6,
      }}>
        Running the EA on your own MetaTrader? Add{' '}
        <code style={{ color: 'var(--color-ink-1)', background: 'var(--color-surface-2)', padding: '1px 6px', borderRadius: 'var(--radius-sm)' }}>
          https://bridge.velquor.app
        </code>
        {' '}under <em>Tools → Options → Expert Advisors → Allow WebRequest</em>. Cloud-hosted accounts need no setup.
        {' '}<Link href="/connect" style={{ color: 'var(--color-ink-1)' }}>Step-by-step guide →</Link>
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
