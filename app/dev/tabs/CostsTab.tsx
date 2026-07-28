'use client'
import { useCallback, useEffect, useState } from 'react'
import { MONO, G, R, B, GO, P, Card, Stat, Btn, inputStyle, fmtDate, tierColor } from '../ui'
import type { CostReport, CostSettings } from '@/lib/admin/costs'

type Payload = CostReport & { settings: CostSettings; terminalsKnown: boolean }

const eur = (n: number) => `€${n.toFixed(2)}`

const SETTING_FIELDS: { key: keyof CostSettings; col: string; label: string; hint: string }[] = [
  { key: 'serverMonthlyEur',   col: 'server_monthly_eur',   label: 'Bridge server / mo', hint: 'Hetzner box — cloud terminals live here' },
  { key: 'hostingMonthlyEur',  col: 'hosting_monthly_eur',  label: 'Hosting / mo',       hint: 'Web app hosting' },
  { key: 'databaseMonthlyEur', col: 'database_monthly_eur', label: 'Database / mo',      hint: 'Database + storage plan' },
  { key: 'domainMonthlyEur',   col: 'domain_monthly_eur',   label: 'Domain / mo',        hint: 'Annual price ÷ 12' },
  { key: 'terminalCapacity',   col: 'terminal_capacity',    label: 'Terminal capacity',  hint: 'Slots the box holds — the divisor for one slot' },
  { key: 'aiCostPerCallEur',   col: 'ai_cost_per_call_eur', label: 'AI € / request',     hint: '0 while on a free tier' },
  { key: 'pricePro',           col: 'price_pro_eur',        label: 'Pro price / mo',     hint: 'What a Pro seat earns' },
  { key: 'priceUltra',         col: 'price_ultra_eur',      label: 'Ultra price / mo',   hint: 'What an Ultra seat earns' },
]

export function CostsTab() {
  const [data, setData]       = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft]     = useState<Record<string, string>>({})
  const [saving, setSaving]   = useState(false)
  const [flash, setFlash]     = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/dev/costs', { cache: 'no-store' })
    if (res.ok) {
      const d: Payload = await res.json()
      setData(d)
      setDraft(Object.fromEntries(SETTING_FIELDS.map(f => [f.col, String(d.settings[f.key])])))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    const body = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number(v)]))
    const res = await fetch('/api/dev/costs', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    setFlash(res.ok ? 'Cost model updated' : `Failed: ${d.error ?? res.status}`)
    if (res.ok) await load()
    setTimeout(() => setFlash(null), 4000)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: G, fontSize: '12px', letterSpacing: '0.1em', opacity: 0.5, fontFamily: MONO }}>Loading cost data...</div>
  if (!data)   return <div style={{ color: R, fontSize: '13px', textAlign: 'center', marginTop: '80px', fontFamily: MONO }}>Failed to load costs</div>

  const t = data.totals
  const marginColor = t.marginEur >= 0 ? G : R

  return (
    <>
      {flash && (
        <div style={{ background: 'rgba(0,255,133,0.06)', border: '1px solid rgba(0,255,133,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: G, fontSize: '11px', fontFamily: MONO }}>
          {flash}
        </div>
      )}

      {/* Row 1 — the bottom line */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
        <Stat label="Fixed cost / mo"  value={eur(t.fixedEur)}       sub="paid whatever happens" />
        <Stat label="Revenue / mo"     value={eur(t.revenueEur)}     sub={`${t.activeUsers} accounts`} color={t.revenueEur > 0 ? G : '#fff'} />
        <Stat label="Margin / mo"      value={eur(t.marginEur)}      sub={t.marginEur >= 0 ? 'in profit' : 'subsidised'} color={marginColor} />
        <Stat label="Cost per user"    value={eur(t.costPerUserEur)} sub="fixed ÷ accounts" />
        <Stat label="Server in use"    value={`${t.serverUtilisationPct}%`} sub={`${t.terminalsUsed} of ${t.terminalCapacity} terminals`} color={t.serverUtilisationPct > 80 ? GO : '#fff'} />
      </div>

      {/* How to read it — this page is easy to misread in an expensive direction */}
      <div style={{ background: 'rgba(75,143,255,0.04)', border: '1px solid rgba(75,143,255,0.15)', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', fontFamily: MONO, fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
        <b style={{ color: B }}>Marginal</b> is what actually goes away if that user leaves — a cloud
        terminal slot, their AI requests, their share of stored rows. A user running the EA on their
        own MetaTrader costs ~<b style={{ color: '#fff' }}>€0</b>.{' '}
        <b style={{ color: B }}>Allocated</b> is their share of the fixed bill ({eur(t.unattributedEur)} spread
        over {t.activeUsers || 1}). It is not a cost they cause, and it <b style={{ color: '#fff' }}>falls</b> as
        you add users — deleting a free user does not save you {eur(t.costPerUserEur)}.
        {!data.terminalsKnown && (
          <div style={{ color: GO, marginTop: '8px' }}>
            ⚠ The provisioner did not answer, so terminal counts are unknown and server cost is
            understated here.
          </div>
        )}
      </div>

      {/* Per-user table */}
      <div style={{ marginBottom: '16px' }}>
        <Card title={`Cost per user (${data.users.length})`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '11px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600 }}>User</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600 }}>Tier</th>
                  <th style={{ padding: '6px 10px', fontWeight: 600 }}>Terminals</th>
                  <th style={{ padding: '6px 10px', fontWeight: 600 }}>AI</th>
                  <th style={{ padding: '6px 10px', fontWeight: 600 }}>Rows</th>
                  <th style={{ padding: '6px 10px', fontWeight: 600 }}>Shots</th>
                  <th style={{ padding: '6px 10px', fontWeight: 600 }}>Marginal</th>
                  <th style={{ padding: '6px 10px', fontWeight: 600 }}>Allocated</th>
                  <th style={{ padding: '6px 10px', fontWeight: 600 }}>Total</th>
                  <th style={{ padding: '6px 10px', fontWeight: 600 }}>Revenue</th>
                  <th style={{ padding: '6px 10px', fontWeight: 600 }}>Margin</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600 }}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                    <td style={{ textAlign: 'left', padding: '8px 10px', color: 'rgba(255,255,255,0.8)' }}>{u.email ?? u.id.slice(0, 8)}</td>
                    <td style={{ textAlign: 'left', padding: '8px 10px', color: tierColor(u.tier), textTransform: 'uppercase' }}>{u.tier}</td>
                    <td style={{ padding: '8px 10px', color: u.terminals > 0 ? GO : 'rgba(255,255,255,0.2)' }}>{u.terminals}</td>
                    <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.5)' }}>{u.aiCalls}</td>
                    <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.5)' }}>{u.rows.toLocaleString('en-GB')}</td>
                    <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.3)' }}>{u.screenshots}</td>
                    <td style={{ padding: '8px 10px', color: u.marginalEur > 0 ? '#fff' : 'rgba(255,255,255,0.25)' }}>{eur(u.marginalEur)}</td>
                    <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.35)' }}>{eur(u.allocatedEur)}</td>
                    <td style={{ padding: '8px 10px', color: '#fff', fontWeight: 700 }}>{eur(u.totalEur)}</td>
                    <td style={{ padding: '8px 10px', color: u.revenueEur > 0 ? G : 'rgba(255,255,255,0.2)' }}>{eur(u.revenueEur)}</td>
                    <td style={{ padding: '8px 10px', color: u.marginEur >= 0 ? G : R, fontWeight: 700 }}>{eur(u.marginEur)}</td>
                    <td style={{ textAlign: 'left', padding: '8px 10px', color: 'rgba(255,255,255,0.25)' }}>{fmtDate(u.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Editable model */}
      <Card
        title="Cost model"
        right={<Btn color={P} small disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Btn>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '10px' }}>
          {SETTING_FIELDS.map(f => (
            <div key={f.col} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: MONO, letterSpacing: '0.05em' }}>{f.label}</label>
              <input
                value={draft[f.col] ?? ''}
                onChange={e => setDraft(d => ({ ...d, [f.col]: e.target.value }))}
                inputMode="decimal"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
              <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '9px', fontFamily: MONO }}>{f.hint}</span>
            </div>
          ))}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontFamily: MONO, marginTop: '12px' }}>
          Saved to the database, not the code — no deploy needed. Put your real invoice figures in
          and every number above re-derives.
        </div>
      </Card>
    </>
  )
}
