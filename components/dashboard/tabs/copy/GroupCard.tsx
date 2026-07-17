'use client'

import { useState } from 'react'
import type { CopyAccount, CopyGroup } from './types'
import { statusDot, timeAgo } from './helpers'
import { AddAccountModal } from './AddAccountModal'
import { HostAccountModal } from './HostAccountModal'
import { SignalLog } from './SignalLog'

export interface CloudInfo {
  hostedIds: string[]           // copy_accounts ids running in a cloud terminal
  mainLogin: string | null      // login of the user's connected main terminal
}

// ── Group Card ────────────────────────────────────────────────────────────────
export function GroupCard({ group, cloud, onRefresh }: { group: CopyGroup; cloud: CloudInfo; onRefresh: () => void }) {
  const [addAccountRole, setAddAccountRole] = useState<'master' | 'slave' | null>(null)
  const [hostAccount,    setHostAccount]    = useState<CopyAccount | null>(null)
  const [toggling,       setToggling]       = useState(false)
  const [showLog,        setShowLog]        = useState(false)
  const [showEaConfig,   setShowEaConfig]   = useState(false)

  const master = group.copy_accounts.find(a => a.role === 'master')
  const slaves = group.copy_accounts.filter(a => a.role === 'slave')

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
      fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 7px',
      borderRadius: '20px', background: 'rgba(0,255,133,0.1)',
      border: '1px solid rgba(0,255,133,0.25)', color: '#00FF85', flexShrink: 0,
    }}>
      CLOUD
    </span>
  )

  const hostButton = (acc: CopyAccount) => isHosted(acc) ? (
    <button
      onClick={() => unhostAccount(acc)}
      title="Stop the hosted cloud terminal"
      style={{
        fontSize: '10px', padding: '4px 10px', borderRadius: '6px',
        background: 'var(--s1)', border: '1px solid var(--bd)',
        color: 'var(--t3)', cursor: 'pointer',
      }}
    >
      Unhost
    </button>
  ) : (
    <button
      onClick={() => setHostAccount(acc)}
      title="Run this account in a VELQUOR cloud terminal"
      style={{
        fontSize: '10px', padding: '4px 10px', borderRadius: '6px', fontWeight: 600,
        background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.3)',
        color: '#00FF85', cursor: 'pointer',
      }}
    >
      Host in Cloud
    </button>
  )

  return (
    <>
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px',
        overflow: 'hidden', marginBottom: '16px',
      }}>
        {/* Group header */}
        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--bd)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: group.active ? '#00FF85' : '#444',
              boxShadow: group.active ? '0 0 6px #00FF85' : undefined,
            }} />
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--t1)' }}>{group.name}</span>
            <span style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
              background: 'var(--s2)', color: 'var(--t3)', letterSpacing: '0.06em',
            }}>
              {group.lot_mode === 'fixed'
                ? `${group.lot_fixed} lots fixed`
                : `${group.lot_multiplier}× lots`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={toggleActive} disabled={toggling}
              style={{
                padding: '5px 12px', borderRadius: '8px', fontSize: '11px',
                background: group.active ? 'rgba(255,51,71,0.1)' : 'rgba(0,255,133,0.1)',
                border:     group.active ? '1px solid rgba(255,51,71,0.3)' : '1px solid rgba(0,255,133,0.3)',
                color:      group.active ? '#FF3347' : '#00FF85',
                cursor:     'pointer', fontWeight: 600,
              }}
            >
              {group.active ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={deleteGroup}
              style={{
                padding: '5px 12px', borderRadius: '8px', fontSize: '11px',
                background: 'var(--s2)', border: '1px solid var(--bd)',
                color: 'var(--t3)', cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Accounts */}
        <div style={{ padding: '16px 20px' }}>

          {/* Master section */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em',
              marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>MASTER ACCOUNT</span>
              {!master && (
                <button
                  onClick={() => setAddAccountRole('master')}
                  style={{
                    fontSize: '10px', color: 'var(--ac)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, fontWeight: 600, letterSpacing: '0.06em',
                  }}
                >
                  + ADD MASTER
                </button>
              )}
            </div>

            {master ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(122,79,255,0.06)', border: '1px solid rgba(122,79,255,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {statusDot(master.status, master.last_seen_at)}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {master.nickname || master.mt5_login}
                      {isHosted(master) && cloudBadge}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                      #{master.mt5_login}{master.mt5_server ? ` · ${master.mt5_server}` : ''} · {timeAgo(master.last_seen_at)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {hostButton(master)}
                  <button
                    onClick={() => removeAccount(master.id)}
                    style={{ fontSize: '11px', color: '#FF3347', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '12px 14px', borderRadius: '10px', textAlign: 'center',
                background: 'var(--s2)', border: '1px dashed var(--bd)',
                fontSize: '12px', color: 'var(--t3)',
              }}>
                No master account — click <strong style={{ color: 'var(--ac)' }}>+ ADD MASTER</strong> above
              </div>
            )}
          </div>

          {/* Slave section */}
          <div>
            <div style={{
              fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em',
              marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>SLAVE ACCOUNTS ({slaves.length})</span>
              <button
                onClick={() => setAddAccountRole('slave')}
                style={{
                  fontSize: '10px', color: 'var(--ac)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, fontWeight: 600, letterSpacing: '0.06em',
                }}
              >
                + ADD SLAVE
              </button>
            </div>

            {slaves.length === 0 ? (
              <div style={{
                padding: '12px 14px', borderRadius: '10px', textAlign: 'center',
                background: 'var(--s2)', border: '1px dashed var(--bd)',
                fontSize: '12px', color: 'var(--t3)',
              }}>
                No slave accounts yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {slaves.map(slave => (
                  <div key={slave.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'var(--s2)', border: '1px solid var(--bd)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {statusDot(slave.status, slave.last_seen_at)}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {slave.nickname || slave.mt5_login}
                          {isHosted(slave) && cloudBadge}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                          #{slave.mt5_login}{slave.mt5_server ? ` · ${slave.mt5_server}` : ''} · {timeAgo(slave.last_seen_at)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {hostButton(slave)}
                      <button
                        onClick={() => toggleAccountStatus(slave)}
                        style={{
                          fontSize: '10px', padding: '4px 10px', borderRadius: '6px',
                          background: 'var(--s1)', border: '1px solid var(--bd)',
                          color: 'var(--t3)', cursor: 'pointer',
                        }}
                      >
                        {slave.status === 'paused' ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        onClick={() => removeAccount(slave.id)}
                        style={{ fontSize: '11px', color: '#FF3347', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* EA config snippet — only needed for self-hosted (own MetaTrader)
            accounts, so collapsed by default to keep the card clean */}
        {(master || slaves.length > 0) && (
          <div style={{
            margin: '0 20px 16px', padding: '12px 14px', borderRadius: '10px',
            background: 'rgba(0,255,133,0.03)', border: '1px solid rgba(0,255,133,0.1)',
          }}>
            <button
              onClick={() => setShowEaConfig(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '10px', color: '#00FF85', letterSpacing: '0.08em', fontWeight: 700 }}>
                EA CONFIGURATION <span style={{ color: 'var(--t3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· for accounts on your own MetaTrader</span>
              </span>
              <span style={{
                fontSize: '10px', color: 'var(--t3)', display: 'inline-block',
                transform: showEaConfig ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s',
              }}>▾</span>
            </button>
            {showEaConfig && <div style={{ marginTop: '8px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--t2)', lineHeight: '1.7' }}>
              <div><span style={{ color: 'var(--t3)' }}>InpCopyMode</span> = <span style={{ color: '#FFD700' }}>COPY_MASTER</span> <span style={{ color: '#555' }}>// or COPY_SLAVE</span></div>
              <div><span style={{ color: 'var(--t3)' }}>InpCopyGroupId</span> = <span style={{ color: '#7A4FFF' }}>"{group.id}"</span></div>
              <div><span style={{ color: 'var(--t3)' }}>InpCopyLotMode</span> = <span style={{ color: '#FFD700' }}>
                {group.lot_mode === 'fixed' ? 'LOT_FIXED' : 'LOT_PROPORTIONAL'}
              </span></div>
              {group.lot_mode === 'fixed'
                ? <div><span style={{ color: 'var(--t3)' }}>InpCopyLotFixed</span> = <span style={{ color: '#00FF85' }}>{group.lot_fixed}</span></div>
                : <div><span style={{ color: 'var(--t3)' }}>InpCopyLotMult</span> = <span style={{ color: '#00FF85' }}>{group.lot_multiplier}</span></div>
              }
              <div><span style={{ color: 'var(--t3)' }}>InpCopyMaxLot</span> = <span style={{ color: '#00FF85' }}>{group.max_lot}</span></div>
            </div>
            </div>}
          </div>
        )}

        {/* Activity log */}
        <div style={{ borderTop: '1px solid var(--bd)' }}>
          <button
            onClick={() => setShowLog(v => !v)}
            style={{
              width: '100%', padding: '10px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '11px', color: 'var(--t3)', fontWeight: 600, letterSpacing: '0.06em',
            }}
          >
            <span>ACTIVITY LOG</span>
            <span style={{
              fontSize: '10px', color: 'var(--t3)',
              display: 'inline-block',
              transform: showLog ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}>▾</span>
          </button>
          {showLog && (
            <div style={{ padding: '0 20px 16px' }}>
              <SignalLog groupId={group.id} />
            </div>
          )}
        </div>
      </div>

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
