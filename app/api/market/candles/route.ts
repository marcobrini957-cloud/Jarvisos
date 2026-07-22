import { NextResponse } from 'next/server'
import { rateLimit, clientIp } from '@/lib/api/rate-limit'

// Map a broker symbol (XAUUSD, NAS100, US30…) to a free Yahoo Finance ticker
// whose OHLC candles track the same instrument closely enough to plot trades on.
function yahooTicker(symbol: string): string {
  const s = symbol.toUpperCase()
  if (s.includes('XAU') || s.includes('GOLD'))                              return 'GC=F'
  if (s.includes('XAG') || s.includes('SILVER'))                            return 'SI=F'
  if (s.includes('NAS') || s.includes('US100') || s.includes('NDX') || s.includes('USTEC')) return '^NDX'
  if (s.includes('US30') || s.includes('DJI')  || s.includes('DOW') || s.includes('WS30'))  return '^DJI'
  if (s.includes('SPX') || s.includes('US500') || s.includes('SP500') || s.includes('SPX500')) return '^GSPC'
  if (s.includes('GER') || s.includes('DAX')   || s.includes('DE40') || s.includes('DE30'))  return '^GDAXI'
  if (s.includes('UK100') || s.includes('FTSE'))                            return '^FTSE'
  if (s.includes('JP225') || s.includes('NIKKEI') || s.includes('N225'))    return '^N225'
  if (s.includes('BTC'))                                                    return 'BTC-USD'
  if (s.includes('ETH'))                                                    return 'ETH-USD'
  if (s.includes('WTI') || s.includes('USOIL') || s.includes('CRUDE'))      return 'CL=F'
  // Plain 6-letter FX pair → Yahoo spot FX (e.g. EURUSD=X)
  if (/^[A-Z]{6}$/.test(s)) return `${s}=X`
  return s
}

const ALLOWED_INTERVALS = new Set(['5m', '15m', '30m', '60m', '1d'])
const ALLOWED_RANGES    = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y'])

// GET /api/market/candles?symbol=XAUUSD&interval=60m&range=3mo
export async function GET(req: Request) {
  if (!rateLimit(`candles:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const symbol   = searchParams.get('symbol') ?? 'XAUUSD'
  const interval = searchParams.get('interval') ?? '60m'
  const range    = searchParams.get('range') ?? '3mo'

  if (!ALLOWED_INTERVALS.has(interval) || !ALLOWED_RANGES.has(range)) {
    return NextResponse.json({ error: 'bad_params' }, { status: 400 })
  }

  const ticker = yahooTicker(symbol)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error(`Yahoo ${ticker} ${res.status}`)
    const data = await res.json()

    const result = data?.chart?.result?.[0]
    const ts     = (result?.timestamp ?? []) as number[]
    const q      = result?.indicators?.quote?.[0] ?? {}

    const candles = ts
      .map((t, i) => ({
        time:  t,
        open:  q.open?.[i],
        high:  q.high?.[i],
        low:   q.low?.[i],
        close: q.close?.[i],
      }))
      .filter(c => c.open != null && c.high != null && c.low != null && c.close != null)

    return NextResponse.json({ symbol, ticker, interval, range, candles })
  } catch (err) {
    return NextResponse.json(
      { error: 'fetch_failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: 502 },
    )
  }
}
