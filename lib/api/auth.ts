import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

// Ban check cache: userId -> { banned, ts }. Best-effort per lambda instance;
// a ban takes effect within BAN_TTL_MS on warm instances, instantly on cold.
const banCache = new Map<string, { banned: boolean; ts: number }>()
const BAN_TTL_MS = 60_000

async function isBanned(userId: string): Promise<boolean> {
  const hit = banCache.get(userId)
  if (hit && Date.now() - hit.ts < BAN_TTL_MS) return hit.banned
  let banned = false
  try {
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data, error } = await sb
      .from('user_profiles')
      .select('banned')
      .eq('id', userId)
      .maybeSingle()
    // Pre-migration (no `banned` column) or transient errors: fail open.
    if (!error && data?.banned === true) banned = true
  } catch {}
  banCache.set(userId, { banned, ts: Date.now() })
  if (banCache.size > 2000) banCache.clear()
  return banned
}

// Cookie-based auth check for API routes.
//
// IMPORTANT: lib/supabase/server's createClient() returns the SERVICE-ROLE
// client when the key is configured — calling auth.getUser() on it always
// fails ("Auth session missing"). Routes must authenticate with THIS helper
// (anon key + request cookies) and only use the service client for data
// access, always scoping queries by the returned user id.
export async function getAuthUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    if (await isBanned(user.id)) return null // banned accounts lose all API access
    return user
  } catch {
    return null
  }
}

export async function getAuthUserId(): Promise<string | null> {
  const user = await getAuthUser()
  return user?.id ?? null
}
