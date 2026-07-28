'use client'

import { useState, useMemo } from 'react'
import { useWeeklyReview, weekStart, weekLabel } from '@/hooks/useWeeklyReview'
import Panel from '@/components/ui/Panel'
import Icon from '@/components/ui/Icon'
import { Num, Select } from '@/components/ui/vq'

// ── Inline Weekly Review ──────────────────────────────────────────────────────

const GRADES     = ['S', 'A', 'B', 'C', 'D', 'F']
const WEEK_MOODS = [
  { key: 'amazing',  label: 'Amazing'  },
  { key: 'good',     label: 'Good'     },
  { key: 'average',  label: 'Average'  },
  { key: 'tough',    label: 'Tough'    },
  { key: 'terrible', label: 'Terrible' },
]

/**
 * Mood is ordinal, so it is carried by brightness, not by five different hues —
 * a good week and a bad week are the same ink at different weights. Only the
 * bottom of the scale keeps red, because that is the one a trader should see.
 */
const WEEK_MOOD_INK: Record<string, string> = {
  amazing:  'var(--color-ink-1)',
  good:     'var(--color-ink-1)',
  average:  'var(--color-ink-2)',
  tough:    'var(--color-ink-3)',
  terrible: 'var(--color-down)',
}

/** Same rule for the self-grade: brightness descends, F is the only chroma. */
const GRADE_INK: Record<string, string> = {
  S: 'var(--color-ink-1)', A: 'var(--color-ink-1)', B: 'var(--color-ink-2)',
  C: 'var(--color-ink-3)', D: 'var(--color-ink-3)', F: 'var(--color-down)',
}

function GradeBtn({ value, selected, onChange }: { value: string; selected: boolean; onChange: () => void }) {
  const ink = GRADE_INK[value]
  return (
    <button onClick={onChange} className="vq-num" style={{
      width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-md)', cursor: 'pointer',
      background:  selected ? 'var(--color-surface-3)' : 'var(--s2)',
      border:      `1px solid ${selected ? 'var(--color-line-3)' : 'var(--bd2)'}`,
      color:       selected ? ink : 'var(--t3)',
    }}>{value}</button>
  )
}

export function WeeklyReviewSection() {
  const { reviews, loading, saveReview, getReview } = useWeeklyReview()
  const currentWeek = weekStart()
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const weekOptions: string[] = []
  for (let i = 0; i < 8; i++) {
    const d = new Date(); d.setDate(d.getDate() - i * 7)
    weekOptions.push(weekStart(d))
  }
  const review = getReview(selectedWeek)
  const [mood,       setMood]      = useState('')
  const [energy,     setEnergy]    = useState(5)
  const [wins,       setWins]      = useState('')
  const [losses,     setLosses]    = useState('')
  const [lessons,    setLessons]   = useState('')
  const [goals,      setGoals]     = useState('')
  const [tGrade,     setTGrade]    = useState('')
  const [lGrade,     setLGrade]    = useState('')
  const [saving,     setSaving]    = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiText,     setAiText]    = useState('')

  useMemo(() => {
    if (review) {
      setMood(review.overall_mood ?? ''); setEnergy(review.energy_level ?? 5)
      setWins(review.wins ?? ''); setLosses(review.losses ?? '')
      setLessons(review.lessons ?? ''); setGoals(review.next_week_goals ?? '')
      setTGrade(review.trading_grade ?? ''); setLGrade(review.life_grade ?? '')
      setAiText(review.ai_analysis ?? '')
    } else {
      setMood(''); setEnergy(5); setWins(''); setLosses('')
      setLessons(''); setGoals(''); setTGrade(''); setLGrade(''); setAiText('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.id, selectedWeek])

  async function handleSave() {
    setSaving(true)
    try {
      await saveReview(selectedWeek, { overall_mood: mood||null, energy_level: energy, wins: wins||null, losses: losses||null, lessons: lessons||null, next_week_goals: goals||null, trading_grade: tGrade||null, life_grade: lGrade||null, ai_analysis: aiText||null })
    } finally { setSaving(false) }
  }

  async function handleGenerate() {
    setGenerating(true); setAiText('')
    try {
      const res = await fetch('/api/velquor/weekly-review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wins, losses, lessons, goals, mood, energy, week: selectedWeek }),
      })
      if (!res.ok || !res.body) { setAiText('Failed to generate.'); return }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let text = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        text += dec.decode(value, { stream: true }); setAiText(text)
      }
      await saveReview(selectedWeek, { overall_mood: mood||null, energy_level: energy, wins: wins||null, losses: losses||null, lessons: lessons||null, next_week_goals: goals||null, trading_grade: tGrade||null, life_grade: lGrade||null, ai_analysis: text })
    } finally { setGenerating(false) }
  }

  const ta: React.CSSProperties = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)',
    borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--t1)',
    // The wins/losses placeholders run to four lines; 80px cut the last one in half.
    fontSize: 'var(--text-base)', outline: 'none', resize: 'vertical', lineHeight: '1.6', minHeight: '104px',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Week selector */}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ color: 'var(--t1)', fontSize: 'var(--text-md)', fontWeight: 600 }}>Weekly Review</p>
          <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)', marginTop: '2px' }}>Reflect on your week · get AI analysis</p>
        </div>
        <Select
          ariaLabel="Week"
          align="right"
          width={196}
          value={selectedWeek}
          onChange={setSelectedWeek}
          options={weekOptions.map(w => ({
            key: w,
            label: w === currentWeek ? `This week — ${weekLabel(w)}` : weekLabel(w),
          }))}
        />
      </div>

      {loading ? <p style={{ color: 'var(--t3)' }}>Loading…</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Panel title="How was your week?">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {WEEK_MOODS.map(m => (
                    <button key={m.key} onClick={() => setMood(m.key)} aria-pressed={mood === m.key} style={{
                      padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-base)', cursor: 'pointer',
                      background: mood === m.key ? 'var(--color-surface-3)' : 'var(--s2)',
                      border: `1px solid ${mood === m.key ? 'var(--color-line-3)' : 'var(--bd2)'}`,
                      color: mood === m.key ? WEEK_MOOD_INK[m.key] : 'var(--t2)',
                    }}>{m.label}</button>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>Energy this week</label>
                    <Num size="base">{energy}/10</Num>
                  </div>
                  <input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--ac)' }} />
                </div>
              </div>
            </Panel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel title="Key wins">
                <textarea value={wins} onChange={e => setWins(e.target.value)} placeholder={"What went well?\n\n• Followed my plan\n• No revenge trades"} style={ta} onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')} onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
              </Panel>
              <Panel title="What didn’t work">
                <textarea value={losses} onChange={e => setLosses(e.target.value)} placeholder={"What went wrong?\n\n• Overtraded"} style={ta} onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')} onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
              </Panel>
            </div>
            <Panel title="Lessons">
              <textarea value={lessons} onChange={e => setLessons(e.target.value)} placeholder="What did you learn that will make you better?" style={{ ...ta, minHeight: '60px' }} onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')} onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
            </Panel>
            <Panel title="Goals for next week">
              <textarea value={goals} onChange={e => setGoals(e.target.value)} placeholder="3 main goals for next week…" style={{ ...ta, minHeight: '60px' }} onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')} onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
            </Panel>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 vq-r font-medium"
                style={{ background: 'var(--color-ink-1)', border: 'none', color: 'var(--color-void)', fontSize: 'var(--text-base)', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save review'}
              </button>
              <button onClick={handleGenerate} disabled={generating} className="flex-1 py-2.5 vq-r font-medium"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'var(--color-ink-1)', fontSize: 'var(--text-base)', cursor: 'pointer', opacity: generating ? 0.6 : 1 }}>
                {generating ? 'VELQUOR is thinking…' : 'Get VELQUOR analysis'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Panel title="Self Grade">
              <div className="flex flex-col gap-4">
                <div>
                  <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', marginBottom: '8px' }}>Trading</p>
                  <div className="flex gap-1.5 flex-wrap">{GRADES.map(g => <GradeBtn key={g} value={g} selected={tGrade === g} onChange={() => setTGrade(g === tGrade ? '' : g)} />)}</div>
                </div>
                <div>
                  <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', marginBottom: '8px' }}>Life &amp; Mindset</p>
                  <div className="flex gap-1.5 flex-wrap">{GRADES.map(g => <GradeBtn key={g} value={g} selected={lGrade === g} onChange={() => setLGrade(g === lGrade ? '' : g)} />)}</div>
                </div>
              </div>
            </Panel>
            <Panel title="VELQUOR analysis">
              {!aiText && !generating ? (
                <p style={{ color: 'var(--t3)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>Fill in your review and click "Get VELQUOR Analysis" for a personalised deep dive using your real trade data.</p>
              ) : generating ? (
                <p style={{ color: 'var(--t1)', fontSize: 'var(--text-base)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{aiText}<span style={{ color: 'var(--color-ink-3)' }}>▌</span></p>
              ) : (
                <p style={{ color: 'var(--t1)', fontSize: 'var(--text-base)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{aiText}</p>
              )}
            </Panel>
            {reviews.filter(r => r.week_start !== selectedWeek).length > 0 && (
              <Panel title="Past Reviews">
                <div className="flex flex-col gap-1">
                  {reviews.filter(r => r.week_start !== selectedWeek).slice(0, 5).map(r => (
                    <button key={r.id} onClick={() => setSelectedWeek(r.week_start)}
                      className="flex items-center justify-between py-2 px-1 rounded text-left"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--bd)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div>
                        <p style={{ color: 'var(--t1)', fontSize: 'var(--text-base)' }}>{weekLabel(r.week_start)}</p>
                        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>{r.overall_mood ?? '—'} · {r.trading_grade ?? '?'} / {r.life_grade ?? '?'}</p>
                      </div>
                      {r.ai_analysis && <span style={{ color: 'var(--color-ink-3)' }} title="Has VELQUOR analysis"><Icon name="spark" size={12} /></span>}
                    </button>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
