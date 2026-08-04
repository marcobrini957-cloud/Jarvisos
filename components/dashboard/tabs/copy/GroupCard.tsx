'use client'

import { useState } from 'react'
import type { CopyAccount, CopyGroup } from './types'
import { statusDot, timeAgo } from './helpers'
import { AddAccountModal } from './AddAccountModal'
import { HostAccountModal } from './HostAccountModal'
import { SignalLog } from './SignalLog'
import Icon from '@/components/ui/Icon'
import { Button, IconButton, Label, Surface } from '@/components/ui/vq'

export interface CloudInfo {
  hostedIds: string[]           // copy_accounts ids running in a cloud terminal
  mainLogin: string | null      // login of the user's connected main terminal
}

// ── Group Card ────────────────────────────────────────────────────────────────
export function GroupCard({ group, cloud, onRefresh }: { group: CopyGroup; cloud: CloudInfo; onRefresh: () => void }) {
  const [addAccountRole, setAddAccountRole] = useState<'leader' | 'follower' | null>(null)
  const [hostAccount,    setHostAccount]    = useState<CopyAccount | null>(null)
  const [toggling,       setToggling]       = useState(false)
  const [showLog,        setShowLog]        = useState(false)
  const [showEaConfig,   setShowEaConfig]   = useState(false)

  const leader = group.copy_accounts.find(a => a.role === 'leader')
  const followers = group.copy_accounts.filter(a => a.role === 'follower')

  async function toggleActive() {
    setToggling(true)
    await fetch(`/api/copy/groups/${group.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: !group.active }),
    })
    setToggling(false)
    onRefresh()
  }

  async function deleteGroup() {
    if (!confirm(`Delete "${group.name}"? This will stop all copy trading in this group.`)) return
    await fetch(`/api/copy/groups/${group.id}`, { method: 'DELETE' })
    onRefresh()
  }

  async function removeAccount(accountId: string) {
    await fetch(`/api/copy/groups/${group.id}/accounts/${accountId}`, { method: 'DELETE' })
    onRefresh()
  }

  async function toggleAccountStatus(acc: CopyAccount) {
    const newStatus = acc.status === 'paused' ? 'active' : 'paused'
    await fetch(`/api/copy/groups/${group.id}/accounts/${acc.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    })
    onRefresh()
  }

  async function unhostAccount(acc: CopyAccount) {
    if (!confirm(`Stop the cloud terminal for #${acc.mt5_login}? Copying stops until you reconnect it (cloud or your own EA).`)) return
    await fetch(`/api/copy/accounts/${acc.id}/connect`, { method: 'DELETE' })
    onRefresh()
  }

  const isHosted = (acc: CopyAccount) => cloud.hostedIds.includes(acc.id)
    || (cloud.mainLogin != null && String(acc.mt5_login) === String(cloud.mainLogin))

  const cloudBadge = (
    <span style={{
      fontSize: 'var(--text-2xs)', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 7px',
      borderRadius: 'var(--radius-xs)', background: 'var(--color-surface-2)',
      border: '1px solid var(--color-line-1)', color: 'var(--color-ink-2)', flexShrink: 0,
    }}>
      CLOUD
    </span>
  )

  const hostButton = (acc: CopyAccount) => isHosted(acc) ? (
    <Button size="sm" variant="ghost" onClick={() => unhostAccount(acc)} title="Stop the hosted cloud terminal">
      Unhost
    </Button>
  ) : (
    <Button size="sm" onClick={() => setHostAccount(acc)} title="Run this account in a VELQUOR cloud terminal">
      Host in cloud
    </Button>
  )

  return (
    <>
      {/* The group is a card like every other card. It used to draw its own —
          --s1 on --bd, the opaque legacy composites — so on a lit background it
          was the one black slab in the product while every other panel was a
          translucent sheet. Surface also brings the heading size, the corner and
          the rise-in for free. */}
      <Surface
        style={{ marginBottom: '12px' }}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: group.active ? 'var(--color-up)' : 'var(--color-ink-4)',
            }} />
            {group.name}
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '3px 9px', borderRadius: '999px',
              background: 'var(--color-surface-2)', color: 'var(--color-ink-3)',
            }}>
              {group.lot_mode === 'fixed'
                ? `${group.lot_fixed} lots fixed`
                : `${group.lot_multiplier}× lots`}
            </span>
          </span>
        }
        action={
          <>
            <Button size="sm" onClick={toggleActive} disabled={toggling}>
              {group.active ? 'Pause' : 'Resume'}
            </Button>
            <Button size="sm" variant="danger" onClick={deleteGroup}>
              Delete
            </Button>
          </>
        }
      >
        {/* Accounts */}
        <div style={{ padding: '4px 18px 0' }}>

          {/* Leader section */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px',
            }}>
              <Label>Leader account</Label>
              {!leader && (
                <Button size="sm" variant="ghost" onClick={() => setAddAccountRole('leader')}>
                  <Icon name="plus" size={12} /> Add leader
                </Button>
              )}
            </div>

            {leader ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                background: 'var(--color-surface-2)', border: '1px solid var(--color-line-1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {statusDot(leader.status, leader.last_seen_at)}
                  <div>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {leader.nickname || leader.mt5_login}
                      {isHosted(leader) && cloudBadge}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
                      #{leader.mt5_login}{leader.mt5_server ? ` · ${leader.mt5_server}` : ''} · {timeAgo(leader.last_seen_at)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {hostButton(leader)}
                  <Button size="sm" variant="danger" onClick={() => removeAccount(leader.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-lg)', textAlign: 'center',
                background: 'transparent', border: '1px dashed var(--color-line-2)',
                fontSize: 'var(--text-base)', color: 'var(--color-ink-3)',
              }}>
                No leader account yet — add one above
              </div>
            )}
          </div>

          {/* Follower section */}
          <div>
            <div style={{
              marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px',
            }}>
              <Label>Follower accounts ({followers.length})</Label>
              <Button size="sm" variant="ghost" onClick={() => setAddAccountRole('follower')}>
                <Icon name="plus" size={12} /> Add follower
              </Button>
            </div>

            {followers.length === 0 ? (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-lg)', textAlign: 'center',
                background: 'transparent', border: '1px dashed var(--color-line-2)',
                fontSize: 'var(--text-base)', color: 'var(--color-ink-3)',
              }}>
                No follower accounts yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {followers.map(follower => (
                  <div key={follower.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {statusDot(follower.status, follower.last_seen_at)}
                      <div>
                        <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {follower.nickname || follower.mt5_login}
                          {isHosted(follower) && cloudBadge}
                        </div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
                          #{follower.mt5_login}{follower.mt5_server ? ` · ${follower.mt5_server}` : ''} · {timeAgo(follower.last_seen_at)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {hostButton(follower)}
                      <Button size="sm" variant="ghost" onClick={() => toggleAccountStatus(follower)}>
                        {follower.status === 'paused' ? 'Resume' : 'Pause'}
                      </Button>
                      <IconButton variant="danger" title="Remove account" onClick={() => removeAccount(follower.id)}>
                        <Icon name="close" size={13} />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* EA config snippet — only needed for self-hosted (own MetaTrader)
            accounts, so collapsed by default to keep the card clean */}
        {(leader || followers.length > 0) && (
          <div style={{
            margin: '12px 18px 0', padding: '12px 14px', borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
          }}>
            <button
              onClick={() => setShowEaConfig(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              }}
            >
              <span className="vq-label">
                EA configuration <span style={{ color: 'var(--color-ink-4)', letterSpacing: 0 }}>· for accounts on your own MetaTrader</span>
              </span>
              <span style={{
                fontSize: 'var(--text-xs)', color: 'var(--t3)', display: 'inline-block',
                transform: showEaConfig ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s',
              }}><Icon name="chevronDown" size={12} /></span>
            </button>
            {showEaConfig && <div style={{ marginTop: '8px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--t2)', lineHeight: '1.7' }}>
              <div><span style={{ color: 'var(--color-ink-3)' }}>InpCopyMode</span> = <span style={{ color: '#FFFFFF' }}>COPY_LEADER</span> <span style={{ color: '#555' }}>// or COPY_FOLLOWER</span></div>
              <div><span style={{ color: 'var(--color-ink-3)' }}>InpCopyGroupId</span> = <span style={{ color: '#FFFFFF' }}>"{group.id}"</span></div>
              <div><span style={{ color: 'var(--color-ink-3)' }}>InpCopyLotMode</span> = <span style={{ color: '#FFFFFF' }}>
                {group.lot_mode === 'fixed' ? 'LOT_FIXED' : 'LOT_PROPORTIONAL'}
              </span></div>
              {group.lot_mode === 'fixed'
                ? <div><span style={{ color: 'var(--color-ink-3)' }}>InpCopyLotFixed</span> = <span style={{ color: 'var(--color-ink-1)' }}>{group.lot_fixed}</span></div>
                : <div><span style={{ color: 'var(--color-ink-3)' }}>InpCopyLotMult</span> = <span style={{ color: 'var(--color-ink-1)' }}>{group.lot_multiplier}</span></div>
              }
              <div><span style={{ color: 'var(--color-ink-3)' }}>InpCopyMaxLot</span> = <span style={{ color: 'var(--color-ink-1)' }}>{group.max_lot}</span></div>
            </div>
            </div>}
          </div>
        )}

        {/* Activity log */}
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-line-1)' }}>
          <button
            onClick={() => setShowLog(v => !v)}
            style={{
              width: '100%', padding: '11px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            <Label>Activity log</Label>
            <span style={{
              fontSize: 'var(--text-xs)', color: 'var(--t3)',
              display: 'inline-block',
              transform: showLog ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}><Icon name="chevronDown" size={12} /></span>
          </button>
          {showLog && (
            <div style={{ padding: '0 18px 16px' }}>
              <SignalLog groupId={group.id} />
            </div>
          )}
        </div>
      </Surface>

      {addAccountRole !== null && (
        <AddAccountModal
          groupId={group.id}
          defaultRole={addAccountRole}
          mainLogin={cloud.mainLogin}
          onClose={() => setAddAccountRole(null)}
          onAdded={onRefresh}
        />
      )}

      {hostAccount !== null && (
        <HostAccountModal
          account={hostAccount}
          mainLogin={cloud.mainLogin}
          onClose={() => setHostAccount(null)}
          onHosted={onRefresh}
        />
      )}
    </>
  )
}
