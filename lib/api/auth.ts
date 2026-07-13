import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

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
    return user ?? null
  } catch {
    return null
  }
}

export async function getAuthUserId(): Promise<string | null> {
  const user = await getAuthUser()
  return user?.id ?? null
}
