'use client'

import { useState } from 'react'
import { inputStyle } from './helpers'

// ── Add Habit Modal ───────────────────────────────────────────────────────────

export function AddHabitModal({ onSave, onClose }: {
  onSave: (name: string, icon: string, category: string) => Promise<void>
  onClose: () => void
}) {
  const [name,     setName]     = useState('')
  const [icon,     setIcon]     = useState('✅')
  const [category, setCategory] = useState('general')
  const [saving,   setSaving]   = useState(false)

  const ICONS = ['✅','📓','💪','😴','🧠','📵','📊','📚','🏃','🥗','💧','🧘','📈','⏰','🎯','💡']

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), icon, category)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="fixed z-50 rounded-xl flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '400px', maxWidth: 'calc(100vw - 32px)',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)', padding: '24px',
        }}>
        <div className="flex items-center justify-between">
          <h2 style={{ color: 'var(--t1)', fontSize: '15px', fontWeight: 500 }}>New Habit</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '20px', cursor: 'pointer' }}>
            ×
          </button>
        </div>

        {/* Icon picker */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: '12px', marginBottom: '6px', display: 'block' }}>Icon</label>
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map(em => (
              <button
                key={em}
                onClick={() => setIcon(em)}
                style={{
                  width: '36px', height: '36px', borderRadius: '8px', fontSize: '18px', cursor: 'pointer',
                  background: icon === em ? 'var(--ac)' : 'var(--s2)',
                  border: icon === em ? '1px solid var(--ac)' : '1px solid var(--bd2)',
                }}>
                {em}
              </button>
            ))}
          </div>
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder="Habit name (e.g. Morning journal)"
          autoFocus
          style={inputStyle}
          onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
          onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
        />

        <div className="flex flex-col gap-1.5">
          <label style={{ color: 'var(--t2)', fontSize: '12px' }}>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="trading">Trading</option>
            <option value="mindset">Mindset</option>
            <option value="health">Health</option>
            <option value="growth">Growth</option>
            <option value="general">General</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-md font-medium"
            style={{
              background: 'var(--gr)', border: 'none', color: 'white',
              fontSize: '13px', cursor: 'pointer',
              opacity: (!name.trim() || saving) ? 0.5 : 1,
            }}>
            {saving ? 'Adding…' : 'Add Habit'}
          </button>
        </div>
      </div>
    </>
  )
}
