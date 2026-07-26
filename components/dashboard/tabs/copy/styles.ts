// ── Shared styles ─────────────────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  background:   'var(--s2)',
  border:       '1px solid var(--bd)',
  borderRadius: 'var(--radius-md)',
  padding:      '10px 12px',
  color:        'var(--t1)',
  fontSize:     '13px',
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
}

export const btnPrimary: React.CSSProperties = {
  flex:         1,
  padding:      '10px 0',
  borderRadius: 'var(--radius-md)',
  fontSize:     '13px',
  fontWeight:   600,
  background:   'rgba(255,255,255,0.15)',
  border:       '1px solid rgba(255,255,255,0.3)',
  color:        'var(--ac)',
  cursor:       'pointer',
}

export const btnSecondary: React.CSSProperties = {
  flex:         1,
  padding:      '10px 0',
  borderRadius: 'var(--radius-md)',
  fontSize:     '13px',
  fontWeight:   400,
  background:   'var(--s2)',
  border:       '1px solid var(--bd)',
  color:        'var(--t3)',
  cursor:       'pointer',
}
