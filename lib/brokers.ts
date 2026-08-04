// Broker catalog: friendly server name → the resolvable MT5 access-server
// address. MT5's own login uses these host:port endpoints; the plain server
// NAME (e.g. "BlueberryMarkets-Live02") does not resolve inside a headless
// cloud terminal, so we map it to the direct address here.
//
// `servers[].name` matches what the user sees in their terminal; `address` is
// what we actually hand the cloud terminal. Unknown brokers fall through to
// a manual host:port entry.

export interface BrokerServer {
  name:    string   // exactly as shown in MT5 (also accepted as free-text)
  address: string   // host:port we actually connect to
  /** 'demo' entries are sorted last and marked; everything else is live. */
  demo?:   boolean
}

export interface Broker {
  id:      string
  name:    string
  servers: BrokerServer[]
}

export const BROKERS: Broker[] = [
  {
    id: 'blueberry',
    name: 'Blueberry Markets',
    servers: [
      { name: 'BlueberryMarkets-Live',   address: 'live.mt5.ts.blueberrymarkets.com:443' },
      { name: 'BlueberryMarkets-Live02', address: 'live2.mt5.ts.blueberrymarkets.com:443' },
      { name: 'BlueberryMarkets-Demo',   address: 'demo.mt5.ts.blueberrymarkets.com:443', demo: true },
    ],
  },
  // Add more brokers here as users bring them. Each entry needs the server name
  // exactly as MetaTrader shows it, and the access-server address behind it.
  //
  // ⚠️ Do not add a broker from memory of its naming pattern. The address is the
  // thing that has to be right, a wrong one fails as a silent login timeout,
  // and "ICMarkets-Live02 is probably icmarkets…" is a guess. Take both values
  // from a connection that actually worked — see `lib/brokers.md` for how.
]

/** Every known server, flattened, with its broker — what the picker lists. */
export function allServers(): Array<{ broker: string; server: BrokerServer }> {
  return BROKERS.flatMap(b => b.servers.map(server => ({ broker: b.name, server })))
    .sort((a, b) => Number(a.server.demo ?? false) - Number(b.server.demo ?? false))
}

/** Substring match over broker and server name, for the search field. */
export function searchServers(query: string) {
  const q = query.trim().toLowerCase()
  const all = allServers()
  if (!q) return all
  return all.filter(({ broker, server }) =>
    broker.toLowerCase().includes(q) || server.name.toLowerCase().includes(q))
}

// Resolve whatever the user submitted (a friendly name, a broker+server pick,
// or a raw host:port) to a connectable address. Returns null if it's neither a
// known name nor a plausible host:port.
export function resolveServerAddress(input: string): string | null {
  const s = input.trim()
  // Already a host:port? accept it.
  if (/^[a-zA-Z0-9.-]+:\d{2,5}$/.test(s)) return s
  // Known friendly name → address (case-insensitive).
  for (const b of BROKERS) {
    for (const srv of b.servers) {
      if (srv.name.toLowerCase() === s.toLowerCase()) return srv.address
      if (srv.address.toLowerCase() === s.toLowerCase()) return srv.address
    }
  }
  return null
}
