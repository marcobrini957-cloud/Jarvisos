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
