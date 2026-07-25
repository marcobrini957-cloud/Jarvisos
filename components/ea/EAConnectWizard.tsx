'use client'

/**
 * EA Connect Wizard — the free/pro onboarding path.
 *
 * Three steps with one big button each (download, copy URL, copy key) plus a
 * live handshake check that polls the profile until the EA's first sync lands.
 * Rendered mock-ups of the two MT5 dialogs stand in for screenshots so the
 * guide never goes stale against a new MT5 build.
 *
 * Used by /connect, the onboarding flow and the Settings tab — one source of
 * truth for "how do I hook up MetaTrader".
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export const BRIDGE_URL = 'https://bridge.velquor.app'
const EA_BINARY  = '/ea/VelquorBridge.ex5'
const EA_SOURCE  = '/ea/VelquorBridge.mq5'
const LS_PROGRESS = 'vq_ea_wizard'

interface EaStatus {
  api_key:      string
  ea_connected: boolean
  ea_last_seen: string | null
  ea_version:   string | null
  ea_broker:    string | null
}

/** Written by scripts/sync-ea.mjs at build time. `binary: false` means the
 *  compiled EA was withheld (stale against the source) — fall back to .mq5. */
interface EaManifest {
  version: string | null
  binary:  boolean
}

type StepKey = 'dl' | 'url' | 'key'
type Progress = Record<StepKey, boolean>

const EMPTY: Progress = { dl: false, url: false, key: false }

function relTime(iso: string | null) {
  if (!iso) return null
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5)    return 'just now'
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ── Bits ──────────────────────────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copy = useCallback((value: string, after?: () => void) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2200)
      after?.()
    }).catch(() => { /* clipboard blocked — the value is on screen anyway */ })
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return { copied, copy }
}

/** Full-width value + copy button. The whole row is the click target. */
function BigCopy({ value, hint, mono = true, onCopied }: {
  value: string
  hint?: string
  mono?: boolean
  onCopied?: () => void
}) {
  const { copied, copy } = useCopy()
  return (
    <div>
      <button
        onClick={() => copy(value, onCopied)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          background: copied ? 'rgba(0,255,133,0.07)' : 'var(--s2)',
          border: `1px solid ${copied ? 'rgba(0,255,133,0.3)' : 'var(--bd2)'}`,
          borderRadius: 'var(--r-md)', padding: '13px 14px',
          cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.18s ease, border-color 0.18s ease',
        }}
      >
        <code style={{
          flex: 1, minWidth: 0,
          fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit',
          fontSize: '13px', color: 'var(--t1)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </code>
        <span style={{
          flexShrink: 0, padding: '6px 13px', borderRadius: 'var(--r-sm)',
          background: copied ? 'rgba(0,255,133,0.15)' : 'var(--ac)',
          color: copied ? 'var(--gr2)' : '#fff',
          fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {copied ? '✓ Copied' : 'Copy'}
        </span>
      </button>
      {hint && (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--t3)', lineHeight: 1.5 }}>{hint}</p>
      )}
    </div>
  )
}

/** Rendered stand-in for MT5's Tools → Options → Expert Advisors dialog. */
function OptionsDialogMock() {
  return (
    <DialogChrome title="Options" tabs={['Server', 'Charts', 'Trade', 'Expert Advisors', 'Events']} activeTab={3}>
      <MockCheck label="Allow algorithmic trading" checked />
      <MockCheck label="Allow WebRequest for listed URL:" checked highlight />
      <div style={{
        margin: '6px 0 0 22px', padding: '7px 9px',
        background: 'rgba(77,143,255,0.07)', border: '1px solid rgba(77,143,255,0.35)',
        borderRadius: '5px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--t1)',
        display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <span style={{ color: 'var(--gr2)' }}>✓</span> {BRIDGE_URL}
      </div>
    </DialogChrome>
  )
}

/** Rendered stand-in for the EA's Inputs tab when you drop it on a chart. */
function InputsDialogMock({ apiKey }: { apiKey: string }) {
  const rows: [string, string, boolean][] = [
    ['Your VELQUOR API Key (vq_...)', apiKey || 'vq_…', true],
    ['Bridge server URL',             BRIDGE_URL,      false],
    ['Sync interval (seconds)',       '10',            false],
    ['Auto chart screenshot',         'true',          false],
  ]
  return (
    <DialogChrome title="VelquorBridge" tabs={['Common', 'Inputs', 'Dependencies']} activeTab={1}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1px', fontSize: '11px' }}>
        <div style={{ padding: '5px 8px', color: 'var(--t3)', fontWeight: 600, borderBottom: '1px solid var(--bd2)' }}>Variable</div>
        <div style={{ padding: '5px 8px', color: 'var(--t3)', fontWeight: 600, borderBottom: '1px solid var(--bd2)' }}>Value</div>
        {rows.map(([label, value, hot]) => (
          <div key={label} style={{ display: 'contents' }}>
            <div style={{
              padding: '6px 8px', color: hot ? 'var(--t1)' : 'var(--t2)',
              background: hot ? 'rgba(77,143,255,0.07)' : 'transparent',
              fontWeight: hot ? 600 : 400,
            }}>{label}</div>
            <div style={{
              padding: '6px 8px', color: hot ? 'var(--ac2)' : 'var(--t2)',
              background: hot ? 'rgba(77,143,255,0.07)' : 'transparent',
              fontFamily: 'monospace', maxWidth: '190px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{value}</div>
          </div>
        ))}
      </div>
    </DialogChrome>
  )
}

function DialogChrome({ title, tabs, activeTab, children }: {
  title: string
  tabs: string[]
  activeTab: number
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--bd2)',
      borderRadius: 'var(--r-md)', overflow: 'hidden', boxShadow: 'var(--shadow-md)',
    }}>
      {/* title bar */}
      <div style={{
        padding: '7px 10px', background: 'var(--s3)', borderBottom: '1px solid var(--bd)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: '11px', color: 'var(--t3)' }}>✕</span>
      </div>
      {/* tab strip */}
      <div style={{ display: 'flex', gap: '2px', padding: '7px 8px 0', borderBottom: '1px solid var(--bd)', overflowX: 'auto' }}>
        {tabs.map((t, i) => (
          <span key={t} style={{
            padding: '4px 9px', fontSize: '10px', whiteSpace: 'nowrap',
            borderRadius: '5px 5px 0 0',
            background: i === activeTab ? 'var(--s3)' : 'transparent',
            color: i === activeTab ? 'var(--t1)' : 'var(--t3)',
            fontWeight: i === activeTab ? 600 : 400,
            border: i === activeTab ? '1px solid var(--bd2)' : '1px solid transparent',
            borderBottom: 'none',
          }}>{t}</span>
        ))}
      </div>
      <div style={{ padding: '11px' }}>{children}</div>
      {/* buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', padding: '0 11px 11px' }}>
        <span style={{
          padding: '4px 14px', fontSize: '10px', borderRadius: '5px',
          background: 'var(--ac)', color: '#fff', fontWeight: 600,
        }}>OK</span>
        <span style={{
          padding: '4px 14px', fontSize: '10px', borderRadius: '5px',
          background: 'var(--s3)', color: 'var(--t2)', border: '1px solid var(--bd2)',
        }}>Cancel</span>
      </div>
    </div>
  )
}

function MockCheck({ label, checked, highlight = false }: { label: string; checked: boolean; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 6px',
      borderRadius: '5px',
      background: highlight ? 'rgba(77,143,255,0.07)' : 'transparent',
      border: highlight ? '1px solid rgba(77,143,255,0.25)' : '1px solid transparent',
      marginBottom: '3px',
    }}>
      <span style={{
        width: '13px', height: '13px', borderRadius: '3px', flexShrink: 0,
        background: checked ? 'var(--ac)' : 'var(--s3)',
        border: `1px solid ${checked ? 'var(--ac)' : 'var(--bd2)'}`,
        color: '#fff', fontSize: '9px', fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{checked ? '✓' : ''}</span>
      <span style={{ fontSize: '11px', color: highlight ? 'var(--t1)' : 'var(--t2)', fontWeight: highlight ? 600 : 400 }}>
        {label}
      </span>
    </div>
  )
}

function StepCard({ n, title, summary, done, open, onToggle, children }: {
  n: number
  title: string
  summary: string
  done: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--s1)',
      border: `1px solid ${open ? 'var(--bd2)' : 'var(--bd)'}`,
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
      transition: 'border-color 0.2s ease',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '13px',
          padding: '14px 16px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          minWidth: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
          background: done ? 'rgba(0,255,133,0.15)' : open ? 'var(--ac)' : 'var(--s3)',
          border: `1px solid ${done ? 'rgba(0,255,133,0.4)' : open ? 'var(--ac)' : 'var(--bd2)'}`,
          color: done ? 'var(--gr2)' : open ? '#fff' : 'var(--t2)',
          fontSize: '12px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s ease',
        }}>
          {done ? '✓' : n}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>{title}</span>
          <span style={{ display: 'block', fontSize: '12px', color: 'var(--t2)', marginTop: '2px' }}>{summary}</span>
        </span>
        <span style={{
          flexShrink: 0, color: 'var(--t3)', fontSize: '11px',
          transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease',
        }}>▶</span>
      </button>

      {open && (
        <div style={{
          padding: '0 16px 16px 55px',
          display: 'flex', flexDirection: 'column', gap: '14px',
          animation: 'fade-in 0.2s ease',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Line({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>{children}</p>
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: 'var(--t1)', fontWeight: 600 }}>{children}</strong>
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: 'monospace', background: 'var(--s3)', borderRadius: '4px',
      padding: '1px 5px', fontSize: '12px', color: 'var(--t1)',
    }}>{children}</code>
  )
}

// ── Live handshake ────────────────────────────────────────────────────────────

function LiveCheck({ status, loading }: { status: EaStatus | null; loading: boolean }) {
  const connected = status?.ea_connected ?? false
  const seen = relTime(status?.ea_last_seen ?? null)

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 'var(--r-lg)',
      background: connected
        ? 'linear-gradient(135deg, rgba(0,255,133,0.09), rgba(0,255,133,0.03))'
        : 'var(--s1)',
      border: `1px solid ${connected ? 'rgba(0,255,133,0.3)' : 'var(--bd2)'}`,
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      {/* pulse / tick */}
      <div style={{ position: 'relative', width: '30px', height: '30px', flexShrink: 0 }}>
        {connected ? (
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'rgba(0,255,133,0.15)', border: '1px solid rgba(0,255,133,0.45)',
            color: 'var(--gr2)', fontSize: '14px', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✓</div>
        ) : (
          <>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '1px solid var(--ac)', opacity: 0.5,
              animation: 'vq-ea-ping 1.9s cubic-bezier(0,0,0.2,1) infinite',
            }} />
            <span style={{
              position: 'absolute', top: '11px', left: '11px',
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--ac)', animation: 'pulse-dot 1.6s ease-in-out infinite',
            }} />
          </>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: '14px', fontWeight: 700,
          color: connected ? 'var(--gr2)' : 'var(--t1)',
        }}>
          {loading
            ? 'Checking your connection…'
            : connected
              ? 'Connected — your trades are syncing'
              : 'Waiting for your first sync…'}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--t2)' }}>
          {connected
            ? [
                status?.ea_broker || null,
                status?.ea_version ? `EA v${status.ea_version}` : null,
                seen ? `last sync ${seen}` : null,
              ].filter(Boolean).join(' · ')
            : 'This checks itself every few seconds — leave the page open while you set up MT5.'}
        </p>
      </div>
    </div>
  )
}

// ── Troubleshooting ───────────────────────────────────────────────────────────

const FIXES: [string, React.ReactNode][] = [
  ['The chart shows a sad face (☹) instead of a smiley', <>Algo trading is off. Click the <Strong>Algo Trading</Strong> button in the MT5 toolbar until it turns green, then remove and re-attach the EA.</>],
  ['Experts tab says "WebRequest is not allowed"', <>The URL didn&apos;t save. Re-open <Strong>Tools → Options → Expert Advisors</Strong>, make sure <Mono>{BRIDGE_URL}</Mono> is in the list with no trailing slash, and that the checkbox above it is ticked.</>],
  ['Experts tab says "401" or "invalid API key"', <>The key was pasted with a space or is from another account. Copy it again in step 3 and re-attach the EA — the inputs only apply when you press OK.</>],
  ['I don\'t see VelquorBridge in the Navigator', <>Right-click anywhere in the Navigator panel and choose <Strong>Refresh</Strong>. If it still isn&apos;t there, the file landed in the wrong folder — use <Strong>File → Open Data Folder</Strong> inside MT5 and drop it in <Mono>MQL5/Experts</Mono>.</>],
  ['Still nothing after 2 minutes', <>Your broker&apos;s terminal may block outgoing requests. Write to <Strong>support@velquor.app</Strong> with a screenshot of the MT5 <Strong>Experts</Strong> tab and we&apos;ll look at it.</>],
]

function Troubleshooting() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, color: 'var(--t2)' }}>
        Not connecting?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {FIXES.map(([q, a], i) => (
          <div key={q} style={{
            background: 'var(--s1)', border: '1px solid var(--bd)',
            borderRadius: 'var(--r-md)', overflow: 'hidden',
          }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                padding: '10px 12px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
                fontSize: '12px', color: 'var(--t2)',
              }}
            >
              <span style={{
                color: 'var(--t3)', fontSize: '10px', flexShrink: 0,
                transform: open === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s ease',
              }}>▶</span>
              <span style={{ flex: 1 }}>{q}</span>
            </button>
            {open === i && (
              <div style={{ padding: '0 12px 12px 30px', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.65, animation: 'fade-in 0.18s ease' }}>
                {a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Wizard ────────────────────────────────────────────────────────────────────

export default function EAConnectWizard({ onConnected }: { onConnected?: () => void } = {}) {
  const [status,   setStatus]   = useState<EaStatus | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [progress, setProgress] = useState<Progress>(EMPTY)
  const [openStep, setOpenStep] = useState<number>(1)
  const [manifest, setManifest] = useState<EaManifest | null>(null)
  const wasConnected = useRef(false)

  // which file do we hand out — the compiled EA, or the source to compile?
  useEffect(() => {
    fetch('/ea/manifest.json')
      .then(r => (r.ok ? r.json() : null))
      .then(m => setManifest(m))
      .catch(() => setManifest(null))
  }, [])

  // restore per-browser progress so a refresh doesn't reset the checkmarks
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_PROGRESS)
      if (raw) setProgress({ ...EMPTY, ...JSON.parse(raw) })
    } catch { /* corrupt entry — start clean */ }
  }, [])

  const mark = useCallback((key: StepKey, next: number) => {
    setProgress(prev => {
      const updated = { ...prev, [key]: true }
      try { localStorage.setItem(LS_PROGRESS, JSON.stringify(updated)) } catch { /* private mode */ }
      return updated
    })
    setOpenStep(next)
  }, [])

  // poll the profile — fast while we're waiting, lazily once it's live
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function tick() {
      try {
        const res = await fetch('/api/user/api-key')
        if (res.ok && !cancelled) {
          const json: EaStatus = await res.json()
          setStatus(json)
          setLoading(false)
          if (json.ea_connected && !wasConnected.current) {
            wasConnected.current = true
            setOpenStep(0)
            onConnected?.()
          }
        }
      } catch { /* offline blip — the next tick retries */ }
      if (!cancelled) timer = setTimeout(tick, wasConnected.current ? 20000 : 4000)
    }

    tick()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [onConnected])

  const apiKey    = status?.api_key ?? ''
  const connected = status?.ea_connected ?? false
  // default to the compiled EA — the manifest only ever downgrades this
  const hasBinary = manifest?.binary !== false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <LiveCheck status={status} loading={loading} />

      {/* ── Step 1 — install ─────────────────────────────────────────────── */}
      <StepCard
        n={1}
        title="Install the EA in MetaTrader 5"
        summary="One file, dropped into your MT5 data folder"
        done={progress.dl}
        open={openStep === 1}
        onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
      >
        <a
          href={hasBinary ? EA_BINARY : EA_SOURCE}
          download={hasBinary ? 'VelquorBridge.ex5' : 'VelquorBridge.mq5'}
          onClick={() => mark('dl', 2)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
            padding: '14px', borderRadius: 'var(--r-md)',
            background: 'var(--ac)', color: '#fff', textDecoration: 'none',
            fontSize: '14px', fontWeight: 700,
            boxShadow: '0 8px 24px rgba(77,143,255,0.25)',
          }}
        >
          ↓ Download VelquorBridge{hasBinary ? '.ex5' : '.mq5'}
          {manifest?.version && (
            <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.75 }}>v{manifest.version}</span>
          )}
        </a>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <Line>
            In MT5: <Strong>File → Open Data Folder</Strong>, then open <Mono>MQL5</Mono> → <Mono>Experts</Mono> and drop the
            file in there.
          </Line>
          {!hasBinary && (
            <Line>
              Open the file in <Strong>MetaEditor</Strong> (double-click it) and press <Strong>F7</Strong> to compile —
              &ldquo;0 errors&rdquo; means it&apos;s ready.
            </Line>
          )}
          <Line>
            Back in MT5, right-click the <Strong>Navigator</Strong> panel → <Strong>Refresh</Strong>.
            <Strong> VelquorBridge</Strong> now appears under Expert Advisors.
          </Line>
          {hasBinary && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--t3)', lineHeight: 1.6 }}>
              Ready to run — no compiling needed. Prefer to read the code first?{' '}
              <a href={EA_SOURCE} download="VelquorBridge.mq5" style={{ color: 'var(--ac)', textDecoration: 'none' }}>
                Download the source (.mq5)
              </a>{' '}
              and press F7 in MetaEditor to build it yourself.
            </p>
          )}
        </div>

        <button
          onClick={() => mark('dl', 2)}
          style={{
            alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
            color: 'var(--ac)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Done — next step →
        </button>
      </StepCard>

      {/* ── Step 2 — allow the URL ───────────────────────────────────────── */}
      <StepCard
        n={2}
        title="Let MT5 talk to VELQUOR"
        summary="Paste one address into the WebRequest allow-list"
        done={progress.url}
        open={openStep === 2}
        onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
      >
        <Line>
          Open <Strong>Tools → Options → Expert Advisors</Strong>, tick
          {' '}<Strong>Allow WebRequest for listed URL</Strong>, then paste this address into the list and press OK:
        </Line>

        <BigCopy value={BRIDGE_URL} onCopied={() => mark('url', 3)} hint="No trailing slash. It should look exactly like the highlighted line below." />

        <OptionsDialogMock />
      </StepCard>

      {/* ── Step 3 — attach ──────────────────────────────────────────────── */}
      <StepCard
        n={3}
        title="Attach it to a chart with your key"
        summary="Drag the EA onto any chart and paste your API key"
        done={progress.key || connected}
        open={openStep === 3}
        onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
      >
        <Line>
          Drag <Strong>VelquorBridge</Strong> from the Navigator onto <Strong>any chart</Strong>{' '}— it reads your whole
          account, so the symbol and timeframe don&apos;t matter.
        </Line>
        <Line>
          In the dialog that opens, go to the <Strong>Inputs</Strong> tab and paste this into
          {' '}<Strong>Your VELQUOR API Key</Strong>:
        </Line>

        <BigCopy value={apiKey || 'loading…'} onCopied={() => mark('key', 0)} hint="Private — this key writes to your VELQUOR account. Never share it." />

        <InputsDialogMock apiKey={apiKey} />

        <Line>
          Press OK, then make sure <Strong>Algo Trading</Strong> is green in the toolbar. A smiley face in the chart&apos;s
          top-right corner means the EA is live — the banner above turns green within ~10 seconds.
        </Line>
      </StepCard>

      {!connected && <Troubleshooting />}
    </div>
  )
}
