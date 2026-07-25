/**
 * Signed euro amount, always `−€606` / `+€422` — never `€-606`.
 * One formatter for every P&L figure in the app so a loss reads the same way
 * everywhere. Uses a real minus sign (U+2212), which aligns with digits in
 * tabular figures where a hyphen does not.
 */
export function eurSigned(value: number, decimals = 0): string {
  const sign = value < 0 ? '−' : '+'
  return `${sign}€${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/** Unsigned euro amount with thousands separators — `€2,358.19`. */
export function eur(value: number, decimals = 2): string {
  return `€${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function formatValue(
  eurValue: number,
  pctValue: number,
  mode: 'eur' | 'pct',
  options?: { showSign?: boolean; decimals?: number }
): string {
  const dec = options?.decimals ?? 2
  if (mode === 'eur') {
    const sign = options?.showSign ? (eurValue >= 0 ? '+' : '-') : (eurValue < 0 ? '-' : '')
    return `${sign}€${Math.abs(eurValue).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
  } else {
    const sign = options?.showSign ? (pctValue >= 0 ? '+' : '-') : (pctValue < 0 ? '-' : '')
    return `${sign}${Math.abs(pctValue).toFixed(dec)}%`
  }
}
