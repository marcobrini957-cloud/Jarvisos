'use client'

import { useState, useEffect, useRef } from 'react'

// ── Ticker Search ─────────────────────────────────────────────────────────────

export interface SearchResult { ticker: string; name: string; exchange: string; type: string }

export function TickerSearch({
  value,
  displayName,
  onSelect,
  inp,
}: {
  value:       string
  displayName: string
  onSelect:    (ticker: string, name: string) => void
  inp:         React.CSSProperties
}) {
  const [query,    setQuery]    = useState(value || displayName || '')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [selected, setSelected] = useState(!!value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(v: string) {
    setQuery(v)
    setSelected(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (v.length < 2) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/portfolio/search?q=${encodeURIComponent(v)}`)
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(true)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 300)
  }

  function pick(r: SearchResult) {
    setQuery(`${r.ticker} — ${r.name}`)
    setResults([])
    setOpen(false)
    setSelected(true)
    onSelect(r.ticker, r.name)
  }

  function clear() {
    setQuery('')
    setSelected(false)
    onSelect('', '')
  }

  const TYPE_COLOR: Record<string, string> = {
    equity:         'var(--ac)',
    etf:            'var(--gr2)',
    etp:            'var(--go2)',
    cryptocurrency: 'var(--am2)',
  }

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef} style={{ position: 'relative' }}>
      <label style={{ color: 'var(--t2)', fontSize: '12px', fontWeight: 500 }}>
        Stock / ETF / Crypto
      </label>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="Search by name or ticker — e.g. Microsoft, NVDA…"
          style={{
            ...inp,
            paddingRight: selected ? '36px' : inp.padding as string,
            borderColor: selected ? 'var(--gr2)' : undefined,
          }}
        />
        {selected && (
          <button onClick={clear}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: '16px', lineHeight: 1,
            }}
            title="Clear selection">×</button>
        )}
        {loading && (
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', fontSize: '11px' }}>
            …
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: 'var(--s1)', border: '1px solid var(--bd2)', borderRadius: '10px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>
          {results.map(r => (
            <button key={r.ticker} onClick={() => pick(r)}
              className="w-full text-left flex items-center gap-3 px-4 py-2.5"
              style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--bd)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--s3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ color: 'var(--t1)', fontWeight: 700, fontSize: '13px', minWidth: '60px' }}>{r.ticker}</span>
              <span style={{ color: 'var(--t2)', fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span style={{ color: 'var(--t3)', fontSize: '10px' }}>{r.exchange}</span>
                <span style={{
                  background: `color-mix(in srgb, ${TYPE_COLOR[r.type] ?? 'var(--ac)'} 15%, transparent)`,
                  color: TYPE_COLOR[r.type] ?? 'var(--ac)',
                  fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.06em',
                }}>{r.type.toUpperCase()}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
