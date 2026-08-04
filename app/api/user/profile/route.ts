import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import { getAuthUser } from '@/lib/api/auth'
import { getUserTier } from '@/lib/api/tier'
import { BE_PIPS, BE_PIPS_MIN, BE_PIPS_MAX, clampBePips } from '@/lib/trading/stats'
import { normaliseLabels } from '@/lib/trading/labels'

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
  be_pips?:          number | null
  tour_shown_count?: number | null
  tour_completed_at?: string | null
  setup_types?:      string[] | null
  trade_tags?:       string[] | null
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
    // Passed through as-is, null included: null means "untouched, use the
    // defaults" and [] means "deleted them all". Coalescing would erase that
    // distinction and hand the defaults back to someone who cleared the list.
    setup_types:  row?.setup_types ?? null,
    trade_tags:   row?.trade_tags  ?? null,
    timezone:     row?.timezone     ?? DEFAULT_PROFILE.timezone,
    currency:     row?.currency     ?? DEFAULT_PROFILE.currency,
    daily_loss_mode:  row?.daily_loss_mode === 'percent' ? 'percent' : DEFAULT_PROFILE.daily_loss_mode,
    daily_loss_value: row?.daily_loss_value != null
      ? Number(row.daily_loss_value)
      : DEFAULT_PROFILE.daily_loss_value,
    // Every field the client needs must be listed here, not merely selected —
    // this shaper is the response, so a column added to the query alone is
    // silently discarded on its way out.
    be_pips: row?.be_pips != null ? clampBePips(row.be_pips) : BE_PIPS,
    tour_shown_count:  row?.tour_shown_count ?? 0,
    tour_completed_at: row?.tour_completed_at ?? null,
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
      .select('email, display_name, avatar_color, avatar_url, timezone, currency, daily_loss_mode, daily_loss_value, be_pips, tour_shown_count, tour_completed_at, setup_types, trade_tags')
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
      setup_types:      string[]
      trade_tags:       string[]
      be_pips:          number
    }>

    const allowed = ['display_name', 'avatar_color', 'timezone', 'currency'] as const
    const update: Record<string, string | number | string[]> = { id: user.id, updated_at: new Date().toISOString() }
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

    // Validated here as well as in the UI: the column has a CHECK constraint,
    // and a rejected upsert would lose the entire patch, not just this field.
    // The bound is what keeps this a calibration rather than a way to file a
    // losing month under "break-even".
    // The trader's own vocabulary. `null` is meaningful — it means "never
    // touched, show the defaults" — so only write when the key was actually
    // sent, and let an empty array through as the real choice it is.
    for (const key of ['setup_types', 'trade_tags'] as const) {
      if (body[key] !== undefined) {
        const clean = normaliseLabels(body[key])
        if (clean === null) {
          return NextResponse.json({ error: `${key} must be an array of strings` }, { status: 400 })
        }
        update[key] = clean
      }
    }

    if (body.be_pips !== undefined) {
      const v = Number(body.be_pips)
      if (!Number.isFinite(v) || v < BE_PIPS_MIN || v > BE_PIPS_MAX) {
        return NextResponse.json(
          { error: `be_pips must be between ${BE_PIPS_MIN} and ${BE_PIPS_MAX}` }, { status: 400 })
      }
      update.be_pips = clampBePips(v)
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(update, { onConflict: 'id' })
      .select('email, display_name, avatar_color, avatar_url, timezone, currency, daily_loss_mode, daily_loss_value, be_pips, tour_shown_count, tour_completed_at, setup_types, trade_tags')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(shapeProfile(data, user.user_metadata))
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
