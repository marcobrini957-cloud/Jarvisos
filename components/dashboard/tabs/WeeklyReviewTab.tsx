'use client'

import { useState, useEffect } from 'react'
import { useWeeklyReview, weekStart, weekLabel } from '@/hooks/useWeeklyReview'
import Panel from '@/components/ui/Panel'

const GRADES = ['S', 'A', 'B', 'C', 'D', 'F']
const MOODS  = [
  { key: 'amazing',  label: '🚀 Amazing' },
  { key: 'good',     label: '😊 Good'    },
  { key: 'average',  label: '😐 Average' },
  { key: 'tough',    label: '😔 Tough'   },
  { key: 'terrible', label: '😤 Terrible'},
]
const MOODS_COLOR: Record<string, string> = {
  amazing:  'var(--go2)',
  good:     'var(--gr2)',
  average:  'var(--am2)',
  tough:    'var(--re)',
  terrible: '#e05cae',
}

function GradeBtn({ value, selected, onChange }: { value: string; selected: boolean; onChange: () => void }) {
  const colors: Record<string, string> = {
    S: 'var(--go2)', A: 'var(--gr2)', B: 'var(--ac)',
    C: 'var(--am2)', D: 'var(--re)',  F: '#e05cae',
  }
  return (
    <button
      onClick={onChange}
      style={{
        width: '38px', height: '38px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
        background:  selected ? `${colors[value]}20` : 'var(--s2)',
        border:      selected ? `1px solid ${colors[value]}` : '1px solid var(--bd2)',
        color:       selected ? colors[value] : 'var(--t3)',
      }}>
      {value}
    </button>
  )
}

export default function WeeklyReviewTab() {
  const { reviews, loading, saveReview, getReview } = useWeeklyReview()

  const currentWeek = weekStart()
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)

  // Generate last 8 weeks for picker
  const weekOptions: string[] = []
  for (let i = 0; i < 8; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    weekOptions.push(weekStart(d))
  }

  const review = getReview(selectedWeek)

  // Form state — synced when review/week changes
  const [mood,        setMood]      = useState('')
  const [energy,      setEnergy]    = useState(5)
  const [wins,        setWins]      = useState('')
  const [losses,      setLosses]    = useState('')
  const [lessons,     setLessons]   = useState('')
  const [goals,       setGoals]     = useState('')
  const [tGrade,      setTGrade]    = useState('')
  const [lGrade,      setLGrade]    = useState('')
  const [saving,      setSaving]    = useState(false)
  const [generating,  setGenerating] = useState(false)
  const [aiText,      setAiText]    = useState('')

  useEffect(() => {
    if (review) {
      setMood(review.overall_mood ?? '')
      setEnergy(review.energy_level ?? 5)
      setWins(review.wins ?? '')
      setLosses(review.losses ?? '')
      setLessons(review.lessons ?? '')
      setGoals(review.next_week_goals ?? '')
      setTGrade(review.trading_grade ?? '')
      setLGrade(review.life_grade ?? '')
      setAiText(review.ai_analysis ?? '')
    } else {
      setMood(''); setEnergy(5); setWins(''); setLosses('')
      setLessons(''); setGoals(''); setTGrade(''); setLGrade('')
      setAiText('')
    }
  }, [review, selectedWeek])

  async function handleSave() {
    setSaving(true)
    try {
      await saveReview(selectedWeek, {
        overall_mood:    mood    || null,
        energy_level:    energy,
        wins:            wins    || null,
        losses:          losses  || null,
        lessons:         lessons || null,
        next_week_goals: goals   || null,
        trading_grade:   tGrade  || null,
        life_grade:      lGrade  || null,
        ai_analysis:     aiText  || null,
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setAiText('')
    try {
      const payload = { wins, losses, lessons, goals, mood, energy, week: selectedWeek }
      const res = await fetch('/api/jarvis/weekly-review', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok || !res.body) { setAiText('Failed to generate. Try again.'); return }
      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += dec.decode(value, { stream: true })
        setAiText(text)
      }
      // Auto-save with AI analysis
      await saveReview(selectedWeek, {
        overall_mood: mood || null, energy_level: energy,
        wins: wins || null, losses: losses || null,
        lessons: lessons || null, next_week_goals: goals || null,
        trading_grade: tGrade || null, life_grade: lGrade || null,
        ai_analysis: text,
      })
    } finally {
      setGenerating(false)
    }
  }

  const textareaStyle = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--bd2)',
    borderRadius: '8px', padding: '10px 12px', color: 'var(--t1)',
    fontSize: '13px', outline: 'none', resize: 'vertical' as const,
    lineHeight: '1.6', minHeight: '80px',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header — week picker */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: 'var(--t1)', fontSize: '16px', fontWeight: 500 }}>Weekly Review</h2>
          <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '2px' }}>Reflect, grade yourself, get Jarvis analysis</p>
        </div>
        <select
          value={selectedWeek}
          onChange={e => setSelectedWeek(e.target.value)}
          style={{
            background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '8px',
            padding: '8px 12px', color: 'var(--t1)', fontSize: '12px', outline: 'none', cursor: 'pointer',
          }}>
          {weekOptions.map(w => (
            <option key={w} value={w}>
              {w === currentWeek ? `This week — ${weekLabel(w)}` : weekLabel(w)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left — form */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Mood + energy */}
          <Panel title="How was your week overall?">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {MOODS.map(m => (
                  <button key={m.key} onClick={() => setMood(m.key)}
                    style={{
                      padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                      background: mood === m.key ? `${MOODS_COLOR[m.key]}18` : 'var(--s2)',
                      border:     mood === m.key ? `1px solid ${MOODS_COLOR[m.key]}` : '1px solid var(--bd2)',
                      color:      mood === m.key ? MOODS_COLOR[m.key] : 'var(--t2)',
                      fontWeight: mood === m.key ? 500 : 400,
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={{ color: 'var(--t2)', fontSize: '12px' }}>Overall energy this week</label>
                  <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 500 }}>{energy}/10</span>
                </div>
                <input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--ac)' }} />
              </div>
            </div>
          </Panel>

          {/* Wins / Losses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="✅ Key Wins">
              <textarea
                value={wins} onChange={e => setWins(e.target.value)}
                placeholder={"What went well this week?\n\n• Followed my trading plan\n• Hit my profit target\n• No revenge trades"}
                style={textareaStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--gr2)')}
                onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
            </Panel>
            <Panel title="❌ What Didn't Work">
              <textarea
                value={losses} onChange={e => setLosses(e.target.value)}
                placeholder={"What went wrong?\n\n• Overtraded on Tuesday\n• Got emotional after a loss\n• Missed key macro event"}
                style={textareaStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--re)')}
                onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
            </Panel>
          </div>

          {/* Lessons */}
          <Panel title="📖 Lessons Learned">
            <textarea
              value={lessons} onChange={e => setLessons(e.target.value)}
              placeholder="What did you learn this week that will make you better next week?"
              style={{ ...textareaStyle, minHeight: '70px' }}
              onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
              onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
          </Panel>

          {/* Goals next week */}
          <Panel title="🎯 Goals for Next Week">
            <textarea
              value={goals} onChange={e => setGoals(e.target.value)}
              placeholder="What are your 3 main goals for next week?"
              style={{ ...textareaStyle, minHeight: '70px' }}
              onFocus={e => (e.target.style.borderColor = 'var(--pu)')}
              onBlur={e => (e.target.style.borderColor = 'var(--bd2)')} />
          </Panel>

          {/* Save button */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-md font-medium"
              style={{ background: 'var(--ac)', border: 'none', color: 'white', fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : '💾 Save Review'}
            </button>
            <button onClick={handleGenerate} disabled={generating}
              className="flex-1 py-2.5 rounded-md font-medium"
              style={{
                background: 'rgba(232,201,106,0.1)', border: '1px solid rgba(232,201,106,0.3)',
                color: 'var(--go2)', fontSize: '13px', cursor: 'pointer', opacity: generating ? 0.6 : 1,
              }}>
              {generating ? '✨ Jarvis is thinking…' : '✨ Generate Jarvis Analysis'}
            </button>
          </div>
        </div>

        {/* Right — grades + AI + past reviews */}
        <div className="flex flex-col gap-4">
          {/* Self-grades */}
          <Panel title="Self Grade">
            <div className="flex flex-col gap-4">
              <div>
                <p style={{ color: 'var(--t2)', fontSize: '12px', marginBottom: '8px' }}>Trading Performance</p>
                <div className="flex gap-1.5 flex-wrap">
                  {GRADES.map(g => (
                    <GradeBtn key={g} value={g} selected={tGrade === g} onChange={() => setTGrade(g === tGrade ? '' : g)} />
                  ))}
                </div>
              </div>
              <div>
                <p style={{ color: 'var(--t2)', fontSize: '12px', marginBottom: '8px' }}>Life & Mindset</p>
                <div className="flex gap-1.5 flex-wrap">
                  {GRADES.map(g => (
                    <GradeBtn key={g} value={g} selected={lGrade === g} onChange={() => setLGrade(g === lGrade ? '' : g)} />
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {/* AI Analysis */}
          <Panel title="✨ Jarvis Analysis">
            {!aiText && !generating ? (
              <div className="flex flex-col gap-2">
                <p style={{ color: 'var(--t3)', fontSize: '12px', lineHeight: 1.6 }}>
                  Fill in your review and click "Generate Jarvis Analysis". Jarvis will pull your actual trade data, journal entries, and habits from this week to give you a personalized deep dive.
                </p>
                <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '4px' }}>
                  Powered by Claude AI · Uses your real Supabase data
                </p>
              </div>
            ) : generating ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: 'var(--go2)', fontSize: '11px', fontWeight: 500 }}>JARVIS</span>
                  <span className="inline-block rounded-full"
                    style={{ width: '6px', height: '6px', background: 'var(--go2)', animation: 'pulse 1s ease-in-out infinite' }} />
                </div>
                <p style={{ color: 'var(--t1)', fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                  {aiText}<span style={{ color: 'var(--go2)' }}>▌</span>
                </p>
              </div>
            ) : (
              <p style={{ color: 'var(--t1)', fontSize: '12px', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{aiText}</p>
            )}
          </Panel>

          {/* Past reviews list */}
          {reviews.length > 1 && (
            <Panel title="Past Reviews">
              {loading ? (
                <p style={{ color: 'var(--t3)', fontSize: '12px' }}>Loading…</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {reviews.filter(r => r.week_start !== selectedWeek).slice(0, 6).map(r => (
                    <button key={r.id}
                      onClick={() => setSelectedWeek(r.week_start)}
                      className="flex items-center justify-between py-2 px-1 rounded transition-colors text-left"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--bd)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div>
                        <p style={{ color: 'var(--t1)', fontSize: '12px' }}>{weekLabel(r.week_start)}</p>
                        <p style={{ color: 'var(--t3)', fontSize: '11px' }}>
                          {r.overall_mood ?? 'no mood'} · Trading: {r.trading_grade ?? '?'} · Life: {r.life_grade ?? '?'}
                        </p>
                      </div>
                      {r.ai_analysis && <span style={{ color: 'var(--go2)', fontSize: '11px' }}>✨</span>}
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
