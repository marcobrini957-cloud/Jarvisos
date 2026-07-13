// Minimal in-memory sliding-window rate limiter for public API routes.
// Per serverless instance (not distributed) — good enough to blunt abuse and
// protect the upstream data providers without adding infrastructure.

const hits = new Map<string, number[]>()

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  if (arr.length >= max) { hits.set(key, arr); return false }
  arr.push(now)
  hits.set(key, arr)
  // Opportunistic cleanup so the map can't grow unbounded
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every(t => now - t >= windowMs)) hits.delete(k)
    }
  }
  return true
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd ? fwd.split(',')[0].trim() : 'unknown'
}
