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
  label:   string   // button label in the UI
  address: string   // host:port we connect to
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
      { name: 'BlueberryMarkets-Live',   label: 'Live 1', address: 'live.mt5.ts.blueberrymarkets.com:443' },
      { name: 'BlueberryMarkets-Live02', label: 'Live 2', address: 'live2.mt5.ts.blueberrymarkets.com:443' },
      { name: 'BlueberryMarkets-Demo',   label: 'Demo',   address: 'demo.mt5.ts.blueberrymarkets.com:443' },
    ],
  },
  // Add more brokers here as users request them. Each new entry needs only the
  // server name(s) and the matching access-server address(es).
]

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
