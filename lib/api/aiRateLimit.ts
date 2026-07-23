import { createClient } from '@supabase/supabase-js'

// Per-user, per-route daily cap for LLM-calling routes. Durable (Postgres-backed,
// survives serverless cold starts) and atomic (single RPC increment).
//
// FAIL-OPEN by design: any error (misconfig, DB blip) returns `true` so a limiter
// problem can never take down the AI features — it only ever *blocks* a request
// we can positively prove is over the daily cap. The caps are generous safety
// nets against runaway abuse/cost, not tight product limits.
const DEFAULT_DAILY_CAP = 200

export async function withinAiLimit(
  userId: string,
  route: string,
  cap: number = DEFAULT_DAILY_CAP,
): Promise<boolean> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data, error } = await sb.rpc('bump_ai_usage', {
      p_user: userId,
      p_route: route,
      p_cap: cap,
    })
    if (error) return true // fail open
    return data !== false
  } catch {
    return true // fail open
  }
}
