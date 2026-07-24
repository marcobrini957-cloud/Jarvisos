import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import { getAuthUser } from '@/lib/api/auth'
import { getUserTier } from '@/lib/api/tier'

const DEFAULT_PROFILE = {
  display_name:  'Trader',
  avatar_color:  'var(--ac)',
  avatar_url:    null as string | null,
  timezone:      'Europe/Vienna',
  currency:      'EUR',
}

export async function GET() {
  try {
    const supabase = await createClient()

    const user = await getAuthUser()
    const userError = null
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_color, avatar_url, timezone, currency')
      .eq('id', user.id)
      .single()

    // Effective tier (honors reward expiry) — drives ad slots + ad-free upsell.
    const tier = await getUserTier(user.id)

    // Fallback name from Google/OAuth metadata when DB still has default
    const metaName: string =
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.user_metadata?.name ||
      ''

    const display_name =
      data?.display_name && data.display_name !== 'Trader'
        ? data.display_name
        : metaName || data?.display_name || DEFAULT_PROFILE.display_name

    return NextResponse.json({
      display_name,
      avatar_color: data?.avatar_color ?? DEFAULT_PROFILE.avatar_color,
      avatar_url:   data?.avatar_url   ?? null,
      timezone:     data?.timezone     ?? DEFAULT_PROFILE.timezone,
      currency:     data?.currency     ?? DEFAULT_PROFILE.currency,
      tier,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const user = await getAuthUser()
    const userError = null
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as Partial<{
      display_name:  string
      avatar_color:  string
      timezone:      string
      currency:      string
    }>

    const allowed = ['display_name', 'avatar_color', 'timezone', 'currency'] as const
    const update: Record<string, string> = { id: user.id, updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key] as string
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(update, { onConflict: 'id' })
      .select('display_name, avatar_color, avatar_url, timezone, currency')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data ?? DEFAULT_PROFILE)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
