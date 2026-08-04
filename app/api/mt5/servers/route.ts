import { NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/api/auth'
import { BROKERS } from '@/lib/brokers'

/**
 * Every MetaTrader 5 server there is — the same list the platform searches.
 *
 * We shipped a hand-written catalog of one broker, so a trader on IC Markets or
 * Vantage typed their broker's name, got nothing, and had to go and find a host
 * and port. That is not a catalog problem to be solved by adding rows: there
 * are ~2,700 MT5 servers and they change, and a list we maintain by hand will
 * always be missing the one in front of the person signing up.
 *
 * MetaQuotes publishes the real one — it is what the MetaTrader web terminal
 * fills its own server field from. `?version=5` returns the MT5 side; the
 * `text` parameter it accepts is ignored server-side, so the whole list comes
 * back and the filtering happens where the typing is.
 *
 * Proxied rather than fetched from the browser: it is a third-party host, so
 * this avoids CORS, keeps their domain out of our CSP, and lets one cached copy
 * serve every user.
 */

const SOURCE = 'https://metatraderweb.app/trade/servers?version=5'
const TTL_MS = 12 * 60 * 60 * 1000

let cache: { at: number; servers: string[] } | null = null

/** The servers we hold an address for — they lead the list, the rest follow. */
function knownNames(): Set<string> {
  return new Set(BROKERS.flatMap(b => b.servers.map(s => s.name.toLowerCase())))
}

export async function GET() {
  // Behind auth: this is a logged-in setup step, and an open proxy to someone
  // else's endpoint is a thing other people would eventually find.
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ servers: cache.servers, cached: true })
  }

  try {
    const res = await fetch(SOURCE, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)
    const data = await res.json() as { mt5?: unknown }
    const list = Array.isArray(data.mt5) ? data.mt5.filter((s): s is string => typeof s === 'string') : []
    if (list.length === 0) throw new Error('empty list')

    const known = knownNames()
    const servers = [...list].sort((a, b) => {
      // Servers we can already resolve to an address connect without anyone
      // hunting for a host, so they come first.
      const ka = known.has(a.toLowerCase()), kb = known.has(b.toLowerCase())
      if (ka !== kb) return ka ? -1 : 1
      return a.localeCompare(b)
    })

    cache = { at: Date.now(), servers }
    return NextResponse.json({ servers, cached: false })
  } catch {
    // Serve a stale copy rather than an empty field; failing that, fall back to
    // what we know, so the form still works when their host does not.
    if (cache) return NextResponse.json({ servers: cache.servers, cached: true, stale: true })
    return NextResponse.json({
      servers: BROKERS.flatMap(b => b.servers.map(s => s.name)),
      fallback: true,
    })
  }
}
