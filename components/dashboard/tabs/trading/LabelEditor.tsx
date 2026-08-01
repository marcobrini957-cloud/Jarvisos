'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { LABEL_MAX_LEN, LABEL_MAX_COUNT } from '@/lib/trading/labels'

/**
 * Edit a list of the trader's own labels — setup names, tags.
 *
 * Deliberately in place rather than behind a trip to Settings. The moment a
 * trader knows what they want to call a setup is the moment they are annotating
 * the trade; sending them to another screen to add it means they pick the
 * closest wrong option instead, and every breakdown built on that string is
 * quietly wrong from then on.
 *
 * Deleting is a real delete, including of everything that shipped by default.
 * Trades already annotated with a removed label keep it — the label lives on
 * the trade row, not as a foreign key — so history never rewrites itself; the
 * name simply stops being offered.
 */
export function LabelEditor({
  labels, onChange, onClose, noun,
}: {
  labels: string[]
  onChange: (next: string[]) => void
  onClose?: () => void
  /** Singular, lowercase — "setup", "tag". Used in the placeholder. */
  noun: string
}) {
  const [draft, setDraft] = useState('')
  const full = labels.length >= LABEL_MAX_COUNT

  function add() {
    const label = draft.trim().replace(/\s+/g, ' ').slice(0, LABEL_MAX_LEN)
    if (!label || full) return
    if (labels.some(l => l.toLowerCase() === label.toLowerCase())) { setDraft(''); return }
    onChange([...labels, label])
    setDraft('')
  }

  return (
    <div style={{
      border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-md)',
      background: 'var(--color-surface-1)', padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
          letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-ink-3)',
        }}>
          Your {noun}s
        </span>
        {onClose && (
          <button onClick={onClose} aria-label="Done editing" style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: 'var(--text-xs)', color: 'var(--color-ink-2)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            Done
          </button>
        )}
      </div>

      {labels.length === 0 && (
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)' }}>
          No {noun}s. Add the ones you actually trade — they drive the breakdowns.
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {labels.map(l => (
          <span key={l} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-sm)',
            padding: '4px 6px 4px 10px', fontSize: 'var(--text-xs)',
            color: 'var(--color-ink-1)', background: 'var(--color-void)',
          }}>
            {l}
            <button
              onClick={() => onChange(labels.filter(x => x !== l))}
              aria-label={`Remove ${l}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-ink-3)', padding: '2px',
              }}
            >
              <Icon name="close" size={11} />
            </button>
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          maxLength={LABEL_MAX_LEN}
          placeholder={full ? `Limit of ${LABEL_MAX_COUNT} reached` : `Add a ${noun}…`}
          disabled={full}
          style={{
            flex: 1, minWidth: 0,
            background: 'var(--color-void)', border: '1px solid var(--color-line-1)',
            borderRadius: 'var(--radius-sm)', padding: '7px 10px',
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
            color: 'var(--color-ink-1)', outline: 'none',
          }}
        />
        <button
          onClick={add}
          disabled={!draft.trim() || full}
          style={{
            border: '1px solid var(--color-line-2)', borderRadius: 'var(--radius-sm)',
            padding: '7px 14px', fontSize: 'var(--text-xs)',
            background: 'none', cursor: draft.trim() && !full ? 'pointer' : 'not-allowed',
            color: draft.trim() && !full ? 'var(--color-ink-1)' : 'var(--color-ink-4)',
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
