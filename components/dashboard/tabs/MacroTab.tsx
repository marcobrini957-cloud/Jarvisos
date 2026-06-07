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

function vienaTime(date: string, time: string): string {
  try {
    return new Date(`${date} ${time}`).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }) + ' VIE'
  } catch { return time }
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
  const [tgSending, setTgSending] = useState(false)
  const [tgSent,    setTgSent]    = useState(false)

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
    if (res.ok) { setBriefingText(data.text); setBriefing(data.briefing); setTgSent(false) }
    setGenerating(false)
  }

  async function sendToTelegram() {
    if (!briefingText) return
    setTgSending(true)
    try {
      const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      const biasLine = (label: string, b: string | null) =>
        `• ${label}: ${b ? b.charAt(0).toUpperCase() + b.slice(1) : 'Analysing…'}`
      const eventLines = todayEvents.slice(0, 5).map(e => `• ${e.currency} — ${e.title} (${e.time})`).join('\n')

      const message = [
        `🌅 *Jarvis Morning Briefing*`,
        `📅 ${today}`,
        ``,
        `📊 *Market Bias*`,
        biasLine('Gold XAUUSD', bias?.gold ?? null),
        biasLine('Nasdaq NAS100', bias?.nasdaq ?? null),
        biasLine('Dollar DXY', bias?.dxy ?? null),
        ``,
        todayEvents.length > 0 ? `📅 *High-Impact Today*\n${eventLines}` : `📅 No high-impact events today`,
        ``,
        `🤖 *Jarvis Analysis*`,
        briefingText.slice(0, 800) + (briefingText.length > 800 ? '…' : ''),
      ].join('\n')

      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const d = await res.json()
      setTgSent(d.ok === true)
    } finally {
      setTgSending(false)
    }
  }

  const today = new Date().toDateString()
  const todayEvents = calendar.filter(e => new Date(e.date).toDateString() === today)
  const byDay = calendar.reduce<Record<string, FFEvent[]>>((acc, ev) => {
    const d = new Date(ev.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
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
        <MetricCard title="Last Briefing"      value={briefing ? new Date(briefing.created_at).toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Vienna'}) : '—'} change="Jarvis · Haiku" changePositive={null} barColor="var(--go2)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: High-impact calendar (red only) */}
        <Panel title="High-Impact Events — This Week" noPadding action={
          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>Forex Factory · red only</span>
        }>
          {calLoading ? (
            <div className="flex items-center justify-center py-8"><span style={{ color: 'var(--t3)', fontSize: '13px' }}>Loading…</span></div>
          ) : calendar.length === 0 ? (
            <div className="flex items-center justify-center py-8"><span style={{ color: 'var(--t3)', fontSize: '13px' }}>No high-impact events this week</span></div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
              {Object.entries(byDay).map(([day, events]) => (
                <div key={day}>
                  <div className="sticky top-0 px-4 py-1.5 flex items-center justify-between"
                    style={{ background: 'var(--s2)', borderBottom: '1px solid var(--bd)', zIndex: 1 }}>
                    <span style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{day}</span>
                    <span style={{ color: 'var(--re)', fontSize: '10px' }}>{events.length} event{events.length !== 1 ? 's' : ''}</span>
                  </div>
                  {events.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid var(--bd)', borderLeft: '2px solid var(--re)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--s3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      <div className="flex-shrink-0" style={{ minWidth: '52px' }}>
                        <span style={{ color: 'var(--re)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em' }}>HIGH</span>
                        <p style={{ color: 'var(--go2)', fontSize: '11px', fontWeight: 500 }}>{ev.currency}</p>
                      </div>

                      <div className="flex-1">
                        <p style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500 }}>{ev.title}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{vienaTime(ev.date, ev.time)}</span>
                          {ev.forecast && <span style={{ color: 'var(--t2)', fontSize: '11px' }}>Fcst: <strong>{ev.forecast}</strong></span>}
                          {ev.previous && <span style={{ color: 'var(--t3)', fontSize: '11px' }}>Prev: {ev.previous}</span>}
                          {ev.actual   && <span style={{ color: 'var(--gr2)', fontSize: '11px' }}>Actual: <strong>{ev.actual}</strong></span>}
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          {ev.affectsGold   && <span style={{ fontSize: '10px', color: 'var(--go2)', background: 'rgba(201,168,76,0.12)', padding: '1px 6px', borderRadius: '4px' }}>Gold</span>}
                          {ev.affectsNasdaq && <span style={{ fontSize: '10px', color: 'var(--ac2)', background: 'rgba(55,138,221,0.12)', padding: '1px 6px', borderRadius: '4px' }}>Nasdaq</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
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

          {/* Jarvis briefing */}
          <Panel title="Jarvis NY Open Briefing" action={
            <div className="flex items-center gap-2">
              <button onClick={briefingText ? sendToTelegram : undefined}
                disabled={tgSending || tgSent || !briefingText}
                title={!briefingText ? 'Generate a briefing first' : 'Send to Telegram'}
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px',
                  cursor: (!briefingText || tgSending || tgSent) ? 'not-allowed' : 'pointer',
                  background: tgSent ? 'rgba(56,211,100,0.12)' : 'rgba(88,166,255,0.1)',
                  border: tgSent ? '1px solid rgba(56,211,100,0.3)' : '1px solid rgba(88,166,255,0.25)',
                  color: tgSent ? 'var(--gr2)' : !briefingText ? 'var(--t3)' : 'var(--ac)',
                  opacity: !briefingText ? 0.5 : 1 }}>
                {tgSending ? 'Sending…' : tgSent ? '✓ Sent' : '✈ Telegram'}
              </button>
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
                <span style={{ color: 'var(--t2)', fontSize: '13px' }}>Jarvis is analysing markets…</span>
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
              <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Click Generate to get today's comprehensive Gold, Nasdaq & world macro briefing from Jarvis.</p>
            )}
          </Panel>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}
