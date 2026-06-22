'use client'

import { useState, useEffect } from 'react'
import MetricCard from '@/components/ui/MetricCard'
import Panel from '@/components/ui/Panel'
import Badge from '@/components/ui/Badge'
import type { FFEvent } from '@/lib/forex-factory/calendar'
import type { NewsItem } from '@/app/api/macro/news/route'

type Bias = 'bullish' | 'bearish' | 'neutral'

const BIAS_STYLES: Record<Bias, { bg: string; border: string; color: string; pill: string }> = {
  bullish: { bg: 'rgba(99,153,34,0.07)',   border: 'rgba(99,153,34,0.25)',   color: 'var(--gr2)',  pill: 'rgba(99,153,34,0.15)' },
  bearish: { bg: 'rgba(226,75,74,0.07)',   border: 'rgba(226,75,74,0.25)',   color: 'var(--re)',   pill: 'rgba(226,75,74,0.15)' },
  neutral: { bg: 'rgba(186,117,23,0.07)',  border: 'rgba(186,117,23,0.25)',  color: 'var(--am2)', pill: 'rgba(186,117,23,0.15)' },
}

function BiasCard({ label, ticker, bias, reason, loading }: { label: string; ticker: string; bias: Bias | null; reason?: string; loading: boolean }) {
  const b  = bias ?? 'neutral'
  const st = BIAS_STYLES[b]
  return (
    <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: st.bg, border: `1px solid ${st.border}` }}>
      <div className="flex items-center justify-between">
        <div>
          <p style={{ color: 'var(--t2)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</p>
          <p style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 500, marginTop: '2px' }}>{ticker}</p>
        </div>
        {loading ? (
          <div className="rounded-full" style={{ width: '64px', height: '24px', background: 'var(--s3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ) : (
          <span style={{ fontSize: '13px', fontWeight: 500, color: st.color, padding: '3px 12px', borderRadius: '20px', background: st.pill }}>
            {b.charAt(0).toUpperCase() + b.slice(1)}
          </span>
        )}
      </div>
      {reason && !loading && (
        <p style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: '1.5' }}>{reason}</p>
      )}
      {!bias && !loading && (
        <p style={{ color: 'var(--t3)', fontSize: '11px' }}>Analysing live headlines…</p>
      )}
    </div>
  )
}

// ── Event explanations ────────────────────────────────────────────────────────

const EVENT_EXPLANATIONS: Record<string, string> = {
  // US
  'non-farm payrolls':       'Measures the number of new jobs added in the US economy (excluding farms). A strong number means the economy is growing — bad for Gold, usually good for USD and Nasdaq.',
  'nfp':                     'Measures the number of new jobs added in the US economy (excluding farms). A strong number means the economy is growing — bad for Gold, usually good for USD and Nasdaq.',
  'cpi':                     'Consumer Price Index — measures inflation by tracking price changes for everyday goods. Higher than expected = more Fed rate hikes → Gold drops, USD rises.',
  'core cpi':                'CPI excluding food and energy — the Fed\'s preferred inflation gauge. Moves Gold and USD sharply because it directly influences interest rate decisions.',
  'ppi':                     'Producer Price Index — inflation at the wholesale/factory level. A leading indicator of CPI. Surprise spike = risk-off, Gold up.',
  'core pce':                'The Fed\'s favourite inflation measure. Drives rate expectations more than CPI. Hot print = hawkish Fed → Gold down, USD up.',
  'pce':                     'Personal Consumption Expenditures — broad inflation measure. The Fed watches this closely to decide whether to raise or cut rates.',
  'fomc':                    'Federal Open Market Committee — the Fed\'s rate-setting meeting. Every word of the statement moves markets. Rate hikes hurt Gold; rate cuts send it flying.',
  'fomc minutes':            'The detailed record of the last Fed meeting, released 3 weeks later. Traders hunt for hints about the next rate move — big Gold and Nasdaq mover.',
  'federal funds rate':      'The Fed\'s benchmark interest rate decision. The single most important event for Gold, Nasdaq, and USD. Higher rates = Gold down; cuts = Gold up.',
  'interest rate decision':  'Central bank sets the official interest rate. Biggest market mover of any session — expect wide spreads and fast candles across Gold and indices.',
  'initial jobless claims':  'Weekly count of Americans filing for unemployment. Rising claims = weakening economy = Gold up. Released every Thursday, consistently moves USD pairs.',
  'gdp':                     'Gross Domestic Product — the total size of the economy. Beats expectations = risk-on (Nasdaq up, Gold down). Miss = risk-off (Gold up).',
  'retail sales':            'Measures consumer spending — the biggest driver of US GDP. Strong number = strong economy = USD up, Gold pressure. Weak = opposite.',
  'jolts':                   'Job Openings and Labor Turnover Survey — shows how many jobs are available. More openings = tight labour market = Fed stays hawkish = Gold sells off.',
  'adp':                     'ADP Employment Change — private payrolls preview released 2 days before NFP. Acts as a warm-up number. Big beat often front-runs NFP reaction.',
  'ism manufacturing':       'Surveys factory managers on production, orders, and employment. Below 50 = contraction. Weak reading = risk-off = Gold up, Nasdaq down.',
  'ism services':            'Same as ISM Manufacturing but for the service sector (70% of US economy). A soft number hits Nasdaq harder than Gold.',
  'consumer confidence':     'How optimistic Americans feel about the economy. Low confidence = less spending = slower growth = Gold can rally.',
  'michigan sentiment':      'University of Michigan consumer sentiment survey. Includes inflation expectations — if people expect more inflation, Gold reacts positively.',
  'trade balance':           'Difference between US exports and imports. A large deficit weighs on USD which tends to lift Gold.',
  // ECB / EUR
  'ecb':                     'European Central Bank rate decision or statement. Moves EUR pairs and indirectly affects Gold through USD strength/weakness.',
  'ecb rate':                'ECB interest rate decision. Hawkish surprise (bigger hike) = EUR up = USD down = Gold up. Dovish = opposite.',
  // BOE / GBP
  'boe':                     'Bank of England rate decision. Moves GBP pairs. Can ripple into Gold if it triggers a broad USD move.',
  'bank of england':         'Bank of England rate decision. Moves GBP pairs and can trigger broader risk sentiment shifts.',
  // BOJ / JPY
  'boj':                     'Bank of Japan decision. JPY is a safe-haven currency — any BOJ surprise can move Gold as traders shift between safe-haven assets.',
  // Generic
  'flash pmi':               'Preliminary Purchasing Managers Index — early read on whether the economy is expanding (>50) or contracting (<50). Fast mover for index futures.',
  'pmi':                     'Purchasing Managers Index — survey of business activity. Above 50 = expansion. Key risk gauge for Nasdaq and Gold.',
  'treasury':                'US government bond auction or yield data. Rising yields hurt Gold and pressure Nasdaq valuations.',
  'yield':                   'Bond yield movement. Higher yields = higher opportunity cost of holding Gold → Gold drops.',
  'crude oil':               'Oil inventory or production data. Sharp moves in oil affect inflation expectations which feed back into Gold and USD.',
}

function getEventExplanation(title: string): string | null {
  const lower = title.toLowerCase()
  for (const [key, val] of Object.entries(EVENT_EXPLANATIONS)) {
    if (lower.includes(key)) return val
  }
  return null
}

function vienaTime(dateIso: string, timeStr: string): string {
  try {
    // Extract YYYY-MM-DD from ISO string like "2025-06-06T00:00:00-0500"
    const datePart = dateIso.split('T')[0]
    // Parse "8:30am" / "12:00pm" / "All Day"
    const match = timeStr.match(/(\d+):(\d+)(am|pm)/i)
    if (!match) return timeStr
    let h = parseInt(match[1])
    const m = parseInt(match[2])
    const ampm = match[3].toLowerCase()
    if (ampm === 'pm' && h !== 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    // Treat FF times as US Eastern (UTC-5 as conservative base)
    const d = new Date(`${datePart}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00-05:00`)
    if (isNaN(d.getTime())) return timeStr
    return d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }) + ' VIE'
  } catch { return timeStr }
}

function dayLabel(dateIso: string): string {
  try {
    const datePart = dateIso.split('T')[0]
    return new Date(datePart + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch { return dateIso }
}

function newsTimeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const NEWS_CAT_COLOR: Record<string, string> = {
  Gold:         'var(--go2)',
  Stocks:       'var(--ac)',
  Fed:          'var(--re)',
  ECB:          'var(--pu)',
  Inflation:    'var(--am2)',
  Economy:      'var(--t2)',
  Geopolitical: 'var(--re)',
  Energy:       'var(--gr2)',
  Asia:         'var(--ac2)',
  Markets:      'var(--t2)',
}

// ── Event Row ─────────────────────────────────────────────────────────────────

function EventRow({ ev, explanation, isToday }: { ev: FFEvent; explanation: string | null; isToday: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      onClick={() => explanation && setOpen(o => !o)}
      style={{
        borderBottom: '1px solid var(--bd)',
        borderLeft: `2px solid ${isToday ? 'var(--re)' : 'rgba(255,61,80,0.3)'}`,
        cursor: explanation ? 'pointer' : 'default',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (explanation) (e.currentTarget as HTMLDivElement).style.background = 'var(--s3)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Time + currency */}
        <div style={{ flexShrink: 0, minWidth: '56px' }}>
          <p style={{ color: 'var(--go2)', fontSize: '12px', fontWeight: 600 }}>{vienaTime(ev.date, ev.time)}</p>
          <p style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '1px' }}>{ev.currency}</p>
        </div>

        {/* Title + numbers */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <p style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>{ev.title}</p>
            {explanation && (
              <span style={{ fontSize: '10px', color: 'var(--t3)', opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {ev.actual   && <span style={{ fontSize: '11px', color: 'var(--gr2)', fontWeight: 600 }}>Actual: {ev.actual}</span>}
            {ev.forecast && <span style={{ fontSize: '11px', color: 'var(--t2)' }}>Fcst: {ev.forecast}</span>}
            {ev.previous && <span style={{ fontSize: '11px', color: 'var(--t3)' }}>Prev: {ev.previous}</span>}
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {ev.affectsGold   && <span style={{ fontSize: '10px', color: 'var(--go2)', background: 'rgba(201,168,76,0.12)', padding: '1px 6px', borderRadius: '4px' }}>Gold</span>}
            {ev.affectsNasdaq && <span style={{ fontSize: '10px', color: 'var(--ac2)', background: 'rgba(55,138,221,0.12)', padding: '1px 6px', borderRadius: '4px' }}>Nasdaq</span>}
          </div>

          {/* Explanation */}
          {open && explanation && (
            <p style={{
              marginTop: '8px', fontSize: '11px', lineHeight: 1.6,
              color: 'var(--t2)',
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '6px',
              borderLeft: '2px solid rgba(255,176,48,0.4)',
            }}>
              {explanation}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MacroTab() {
  const [calendar, setCalendar]     = useState<FFEvent[]>([])
  const [news, setNews]             = useState<NewsItem[]>([])
  const [bias, setBias]             = useState<{ gold: Bias; nasdaq: Bias; dxy: Bias; reason: string } | null>(null)
  const [briefing, setBriefing]     = useState<{ full_briefing_text: string | null; created_at: string } | null>(null)
  const [calLoading, setCalLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showFull, setShowFull]     = useState(false)
  const [briefingText, setBriefingText] = useState<string | null>(null)
  const [newsRefresh, setNewsRefresh] = useState(0)

  // Fetch calendar + briefing
  useEffect(() => {
    setCalLoading(true)
    fetch('/api/macro').then(r => r.json()).then(d => {
      setCalendar(d.calendar ?? [])
      if (d.briefing) { setBriefing(d.briefing); setBriefingText(d.briefing.full_briefing_text) }
      setCalLoading(false)
    }).catch(() => setCalLoading(false))
  }, [])

  // Fetch live news + auto-bias (refreshes every 2 min)
  useEffect(() => {
    setNewsLoading(true)
    fetch('/api/macro/news').then(r => r.json()).then(d => {
      setNews(d.news ?? [])
      if (d.bias) setBias(d.bias)
      setNewsLoading(false)
    }).catch(() => setNewsLoading(false))
  }, [newsRefresh])

  useEffect(() => {
    const id = setInterval(() => setNewsRefresh(n => n + 1), 120000) // refresh every 2 min
    return () => clearInterval(id)
  }, [])

  async function generateBriefing() {
    setGenerating(true); setBriefingText(null)
    const res  = await fetch('/api/macro', { method: 'POST' })
    const data = await res.json()
    if (res.ok) { setBriefingText(data.text); setBriefing(data.briefing) }
    setGenerating(false)
  }

  const todayDateStr = new Date().toISOString().split('T')[0]
  const todayEvents  = calendar.filter(e => e.date.split('T')[0] === todayDateStr)
  const byDay = calendar.reduce<Record<string, FFEvent[]>>((acc, ev) => {
    const d = dayLabel(ev.date)
    if (!acc[d]) acc[d] = []
    acc[d].push(ev)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      {/* Bias cards — driven by live Financial Juice headlines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BiasCard label="Day Trading"  ticker="XAUUSD — Gold"    bias={bias?.gold   ?? null} reason={bias?.reason} loading={newsLoading} />
        <BiasCard label="Day Trading"  ticker="NAS100 — Nasdaq"  bias={bias?.nasdaq ?? null} reason={bias?.reason} loading={newsLoading} />
        <BiasCard label="DXY Outlook"  ticker="Dollar Index"     bias={bias?.dxy    ?? null} reason={bias?.reason} loading={newsLoading} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="High-Impact Today"  value={`${todayEvents.length}`}   change="Red folders only"          changePositive={null} barColor="var(--re)" />
        <MetricCard title="High-Impact Week"   value={`${calendar.length}`}      change="Forex Factory"             changePositive={null} barColor="var(--am)" />
        <MetricCard title="Live Headlines"     value={`${news.length}`}          change="Financial Juice · live"    changePositive={null} barColor="var(--ac)" />
        <MetricCard title="Last Briefing"      value={briefing ? new Date(briefing.created_at).toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Vienna'}) : '—'} change="VELQUOR · Haiku" changePositive={null} barColor="var(--go2)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: High-impact calendar */}
        <Panel title="High-Impact Events — This Week" noPadding action={
          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>Forex Factory · red only</span>
        }>
          {calLoading ? (
            <div className="flex items-center justify-center py-8"><span style={{ color: 'var(--t3)', fontSize: '13px' }}>Loading…</span></div>
          ) : calendar.length === 0 ? (
            <div className="flex items-center justify-center py-8"><span style={{ color: 'var(--t3)', fontSize: '13px' }}>No high-impact events this week</span></div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
              {Object.entries(byDay).map(([day, events], groupIdx) => {
                const isToday    = events.some(e => e.date.split('T')[0] === todayDateStr)
                const isTomorrow = (() => {
                  const tom = new Date(); tom.setDate(tom.getDate() + 1)
                  const tomStr = tom.toISOString().split('T')[0]
                  return events.some(e => e.date.split('T')[0] === tomStr)
                })()

                return (
                  <div key={day}>
                    {/* Day header — banner style for today/tomorrow */}
                    {isToday ? (
                      <div className="sticky top-0 px-4 py-3 flex items-center justify-between" style={{
                        background: 'rgba(255,61,80,0.12)',
                        borderBottom: '1px solid rgba(255,61,80,0.25)',
                        borderLeft: '3px solid var(--re)',
                        zIndex: 1,
                      }}>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full" style={{ width: '7px', height: '7px', background: 'var(--re)', display: 'inline-block', boxShadow: '0 0 6px var(--re)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                          <span style={{ color: 'var(--re)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>TODAY</span>
                          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{day}</span>
                        </div>
                        <span style={{ color: 'var(--re)', fontSize: '12px', fontWeight: 600 }}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
                      </div>
                    ) : isTomorrow ? (
                      <div className="sticky top-0 px-4 py-2.5 flex items-center justify-between" style={{
                        background: 'rgba(240,168,64,0.08)',
                        borderBottom: '1px solid rgba(240,168,64,0.2)',
                        borderLeft: '3px solid var(--am2)',
                        zIndex: 1,
                      }}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--am2)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>TOMORROW</span>
                          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{day}</span>
                        </div>
                        <span style={{ color: 'var(--am2)', fontSize: '11px' }}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
                      </div>
                    ) : (
                      <div className="sticky top-0 px-4 py-1.5 flex items-center justify-between" style={{
                        background: 'var(--s2)', borderBottom: '1px solid var(--bd)', zIndex: 1,
                      }}>
                        <span style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{day}</span>
                        <span style={{ color: 'var(--re)', fontSize: '10px' }}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}

                    {/* Events */}
                    {events.map((ev, i) => {
                      const explanation = getEventExplanation(ev.title)
                      return (
                        <EventRow key={i} ev={ev} explanation={explanation} isToday={isToday} />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        {/* RIGHT col */}
        <div className="flex flex-col gap-4">
          {/* Financial Juice live news */}
          <Panel title="Live Market News" noPadding action={
            <div className="flex items-center gap-2">
              <span className="rounded-full" style={{ width: '6px', height: '6px', background: 'var(--gr2)', display: 'inline-block', boxShadow: '0 0 5px var(--gr2)' }} />
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>Financial Juice · live</span>
              <button onClick={() => setNewsRefresh(n => n + 1)}
                style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '11px', cursor: 'pointer' }}>↻</button>
            </div>
          }>
            {newsLoading ? (
              <div className="flex items-center justify-center py-6"><span style={{ color: 'var(--t3)', fontSize: '13px' }}>Fetching headlines…</span></div>
            ) : news.length === 0 ? (
              <div className="flex items-center justify-center py-6"><span style={{ color: 'var(--t3)', fontSize: '13px' }}>No headlines available</span></div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: '260px' }}>
                {news.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 transition-colors"
                    style={{ borderBottom: '1px solid var(--bd)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--s3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="flex-shrink-0 mt-0.5">
                      <span style={{ fontSize: '10px', color: NEWS_CAT_COLOR[item.category] ?? 'var(--t2)', background: `${NEWS_CAT_COLOR[item.category] ?? 'var(--t2)'}15`, padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        {item.category}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p style={{ color: item.priority === 'high' ? 'var(--t1)' : 'var(--t2)', fontSize: '12px', lineHeight: '1.5', fontWeight: item.priority === 'high' ? 500 : 400 }}>
                        {item.headline}
                      </p>
                      <p style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '2px' }}>{newsTimeAgo(item.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* VELQUOR briefing */}
          <Panel title="VELQUOR NY Open Briefing" action={
            <div className="flex items-center gap-2">
              <button onClick={generateBriefing} disabled={generating}
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', cursor: generating ? 'not-allowed' : 'pointer',
                  background: 'rgba(232,201,106,0.12)', border: '1px solid rgba(232,201,106,0.25)', color: 'var(--go2)' }}>
                {generating ? '⟳ Generating…' : '↻ Generate'}
              </button>
            </div>
          }>
            {generating && !briefingText ? (
              <div className="flex items-center gap-2">
                <span className="rounded-full" style={{ width: '6px', height: '6px', background: 'var(--go2)', display: 'inline-block', animation: 'pulse 1s ease-in-out infinite' }} />
                <span style={{ color: 'var(--t2)', fontSize: '13px' }}>VELQUOR is analysing markets…</span>
              </div>
            ) : briefingText ? (
              <div>
                <div className="overflow-y-auto" style={{ maxHeight: showFull ? 'none' : '200px', color: 'var(--t1)', fontSize: '12px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                  {briefingText}
                </div>
                <button onClick={() => setShowFull(f => !f)}
                  style={{ color: 'var(--ac)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                  {showFull ? '↑ Collapse' : '↓ Expand full briefing'}
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Click Generate to get today's comprehensive Gold, Nasdaq & world macro briefing from VELQUOR.</p>
            )}
          </Panel>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}
