'use client'

import { useState } from 'react'
import type { CopyAccount, CopyGroup } from './types'
import { statusDot, timeAgo } from './helpers'
import { AddAccountModal } from './AddAccountModal'
import { SignalLog } from './SignalLog'

// ── Group Card ────────────────────────────────────────────────────────────────
export function GroupCard({ group, onRefresh }: { group: CopyGroup; onRefresh: () => void }) {
  const [addAccountRole, setAddAccountRole] = useState<'master' | 'slave' | null>(null)
  const [toggling,       setToggling]       = useState(false)
  const [showLog,        setShowLog]        = useState(false)

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
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
                      {master.nickname || master.mt5_login}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                      #{master.mt5_login}{master.mt5_server ? ` · ${master.mt5_server}` : ''} · {timeAgo(master.last_seen_at)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeAccount(master.id)}
                  style={{ fontSize: '11px', color: '#FF3347', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Remove
                </button>
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
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
                          {slave.nickname || slave.mt5_login}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                          #{slave.mt5_login}{slave.mt5_server ? ` · ${slave.mt5_server}` : ''} · {timeAgo(slave.last_seen_at)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
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

        {/* EA config snippet */}
        {(master || slaves.length > 0) && (
          <div style={{
            margin: '0 20px 16px', padding: '12px 14px', borderRadius: '10px',
            background: 'rgba(0,255,133,0.03)', border: '1px solid rgba(0,255,133,0.1)',
          }}>
            <div style={{ fontSize: '10px', color: '#00FF85', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
              EA CONFIGURATION
            </div>
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
          onClose={() => setAddAccountRole(null)}
          onAdded={onRefresh}
        />
      )}
    </>
  )
}
