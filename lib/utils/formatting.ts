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

// For showing both simultaneously (portfolio tab)
export function formatBoth(eurValue: number, pctValue: number): string {
  const eurSign = eurValue >= 0 ? '+' : '-'
  const pctSign = pctValue >= 0 ? '+' : '-'
  return `${eurSign}€${Math.abs(eurValue).toFixed(2)} · ${pctSign}${Math.abs(pctValue).toFixed(2)}%`
}

export function formatEur(value: number, showSign = false): string {
  const sign = showSign ? (value >= 0 ? '+' : '-') : (value < 0 ? '-' : '')
  return `${sign}€${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
