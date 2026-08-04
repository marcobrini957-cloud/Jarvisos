// ── Shared styles ─────────────────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  background:   'var(--color-surface-2)',
  border:       '1px solid var(--color-line-1)',
  borderRadius: 'var(--radius-lg)',
  padding:      '7px 10px',
  color:        'var(--color-ink-1)',
  fontFamily:   'var(--font-display)',
  fontSize:     'var(--text-base)',
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
}

/** The one primary action: ink fill, void label. A pill, like every other
    button in the product — these three modals were the last rectangles. */
export const btnPrimary: React.CSSProperties = {
  flex:         1,
  padding:      '9px 0',
  borderRadius: '999px',
  fontFamily:   'var(--font-display)',
  fontSize:     'var(--text-base)',
  background:   'var(--color-ink-1)',
  border:       'none',
  color:        'var(--color-void)',
  cursor:       'pointer',
}

export const btnSecondary: React.CSSProperties = {
  flex:         1,
  padding:      '9px 0',
  borderRadius: '999px',
  fontFamily:   'var(--font-display)',
  fontSize:     'var(--text-base)',
  background:   'transparent',
  border:       '1px solid var(--color-line-1)',
  color:        'var(--color-ink-2)',
  cursor:       'pointer',
}
