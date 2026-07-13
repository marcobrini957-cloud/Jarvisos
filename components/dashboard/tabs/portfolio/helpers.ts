// ── Constants ─────────────────────────────────────────────────────────────────

export const TROY_OZ_TO_GRAMS = 31.1034768

export const METAL_OPTIONS: Record<string, { label: string; symbol: string; color: string }> = {
  'GC=F': { label: 'Gold',   symbol: 'Au', color: 'var(--go2)' },
  'SI=F': { label: 'Silver', symbol: 'Ag', color: '#A8A9AD'    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fmtEur(n: number): string {
  return `€${Math.abs(n).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
export function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
export function sign(n: number): string { return n >= 0 ? '+' : '-' }

export const HOLDING_COLORS: Record<string, string> = {
  NVDA: 'var(--am2)', MSFT: 'var(--ac)',
  IQQW: 'var(--gr2)', 'IQQW.DE': 'var(--gr2)',
  IQQH: 'var(--pu)',  'IQQH.DE': 'var(--pu)',
  ICLN: 'var(--pu)',  AAPL: 'var(--ac2)',
  AMZN: 'var(--am2)', GOOGL: 'var(--re)', META: 'var(--ac)',
  'GC=F': 'var(--go2)', 'SI=F': '#A8A9AD',
}
export function holdingColor(ticker: string): string {
  return HOLDING_COLORS[ticker] ?? 'var(--go2)'
}
