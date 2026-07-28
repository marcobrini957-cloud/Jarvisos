'use client'

import { useState } from 'react'
import { inputStyle } from './helpers'
import Icon from '@/components/ui/Icon'
import { Segmented } from '@/components/ui/vq'
import { HABIT_ICONS, DEFAULT_HABIT_ICON } from './habitIcon'

const CATEGORIES = [
  { key: 'trading', label: 'Trading' },
  { key: 'mindset', label: 'Mindset' },
  { key: 'health',  label: 'Health'  },
  { key: 'growth',  label: 'Growth'  },
  { key: 'general', label: 'General' },
]

// ── Add Habit Modal ───────────────────────────────────────────────────────────

export function AddHabitModal({ onSave, onClose }: {
  onSave: (name: string, icon: string, category: string) => Promise<void>
  onClose: () => void
}) {
  const [name,     setName]     = useState('')
  const [icon,     setIcon]     = useState<string>(DEFAULT_HABIT_ICON)
  const [category, setCategory] = useState('general')
  const [saving,   setSaving]   = useState(false)

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
        className="vq-modal fixed z-50 vq-r flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '400px', maxWidth: 'calc(100vw - 32px)',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          padding: '24px',
        }}>
        <div className="flex items-center justify-between">
          <h2 style={{ color: 'var(--t1)', fontSize: 'var(--text-md)', fontWeight: 500 }}>New Habit</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 'var(--text-xl)', cursor: 'pointer' }}>
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* Icon picker */}
        <div>
          <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', marginBottom: '6px', display: 'block' }}>Icon</label>
          <div className="flex flex-wrap gap-1.5">
            {HABIT_ICONS.map(n => (
              <button
                key={n}
                onClick={() => setIcon(n)}
                aria-label={n}
                aria-pressed={icon === n}
                className="flex items-center justify-center"
                style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: icon === n ? 'var(--color-surface-3)' : 'var(--s2)',
                  border: `1px solid ${icon === n ? 'var(--color-line-3)' : 'var(--bd2)'}`,
                  color: icon === n ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                }}>
                <Icon name={n} size={16} />
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
          onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
          onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
        />

        <div className="flex flex-col gap-1.5">
          <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)' }}>Category</label>
          <Segmented
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 vq-r"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: 'var(--text-base)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 vq-r font-medium"
            style={{
              background: 'var(--color-ink-1)', border: 'none', color: 'var(--color-void)',
              fontSize: 'var(--text-base)', cursor: 'pointer',
              opacity: (!name.trim() || saving) ? 0.5 : 1,
            }}>
            {saving ? 'Adding…' : 'Add Habit'}
          </button>
        </div>
      </div>
    </>
  )
}
