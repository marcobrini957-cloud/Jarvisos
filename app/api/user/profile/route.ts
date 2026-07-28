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
  // 'amount' → value is in account currency; 'percent' → share of balance.
  daily_loss_mode:  'amount' as 'amount' | 'percent',
  daily_loss_value: 200,
}

/** Row shape both handlers read back. */
type ProfileRow = {
  display_name?:     string | null
  avatar_color?:     string | null
  avatar_url?:       string | null
  timezone?:         string | null
  currency?:         string | null
  daily_loss_mode?:  string | null
  daily_loss_value?: number | string | null
}

/**
 * GET applied the OAuth-name fallback and PATCH did not, so the two handlers
 * answered differently for the same user. That was invisible while PATCH was
 * failing; once it worked, saving any setting would have replaced a Google
 * display name with the literal "Trader" in the UI. One shaper, both routes.
 */
function shapeProfile(row: ProfileRow | null, meta: Record<string, unknown> | undefined) {
  const metaName =
    (meta?.full_name as string) ||
    (meta?.display_name as string) ||
    (meta?.name as string) ||
    ''

  const display_name =
    row?.display_name && row.display_name !== 'Trader'
      ? row.display_name
      : metaName || row?.display_name || DEFAULT_PROFILE.display_name

  return {
    display_name,
    avatar_color: row?.avatar_color ?? DEFAULT_PROFILE.avatar_color,
    avatar_url:   row?.avatar_url   ?? null,
    timezone:     row?.timezone     ?? DEFAULT_PROFILE.timezone,
    currency:     row?.currency     ?? DEFAULT_PROFILE.currency,
    daily_loss_mode:  row?.daily_loss_mode === 'percent' ? 'percent' : DEFAULT_PROFILE.daily_loss_mode,
    daily_loss_value: row?.daily_loss_value != null
      ? Number(row.daily_loss_value)
      : DEFAULT_PROFILE.daily_loss_value,
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const user = await getAuthUser()
    const userError = null
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_color, avatar_url, timezone, currency, daily_loss_mode, daily_loss_value')
      .eq('id', user.id)
      .single()

    // This used to be discarded, which is how a missing `avatar_url` column
    // went unnoticed: the select failed for every user, the route fell through
    // to DEFAULT_PROFILE, and the settings people saved never came back. A
    // profile that cannot be read is worth a log line. PGRST116 is simply
    // "no row yet", which is normal for a new account.
    if (error && error.code !== 'PGRST116') {
      console.error('[user/profile] select failed —', error.message)
    }

    // Effective tier (honors reward expiry) — drives ad slots + ad-free upsell.
    const tier = await getUserTier(user.id)

    return NextResponse.json({ ...shapeProfile(data, user.user_metadata), tier })
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
      display_name:     string
      avatar_color:     string
      timezone:         string
      currency:         string
      daily_loss_mode:  string
      daily_loss_value: number
    }>

    const allowed = ['display_name', 'avatar_color', 'timezone', 'currency'] as const
    const update: Record<string, string | number> = { id: user.id, updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key] as string
    }

    // The risk limit is validated here, not just in the UI — the column has
    // check constraints and a rejected upsert would lose the whole patch.
    if (body.daily_loss_mode !== undefined) {
      if (body.daily_loss_mode !== 'amount' && body.daily_loss_mode !== 'percent') {
        return NextResponse.json({ error: 'daily_loss_mode must be amount or percent' }, { status: 400 })
      }
      update.daily_loss_mode = body.daily_loss_mode
    }
    if (body.daily_loss_value !== undefined) {
      const v = Number(body.daily_loss_value)
      const mode = (body.daily_loss_mode ?? 'amount') as string
      const max  = mode === 'percent' ? 100 : 1_000_000
      if (!Number.isFinite(v) || v <= 0 || v > max) {
        return NextResponse.json({ error: 'daily_loss_value out of range' }, { status: 400 })
      }
      update.daily_loss_value = v
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(update, { onConflict: 'id' })
      .select('display_name, avatar_color, avatar_url, timezone, currency, daily_loss_mode, daily_loss_value')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(shapeProfile(data, user.user_metadata))
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
