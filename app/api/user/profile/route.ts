import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

const DEFAULT_PROFILE = {
  display_name: 'Trader',
  avatar_color: 'var(--ac)',
  timezone:     'Europe/Vienna',
  currency:     'EUR',
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_color, timezone, currency')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      // Return defaults when no profile row exists yet
      return NextResponse.json(DEFAULT_PROFILE)
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as Partial<{
      display_name: string
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
      .select('display_name, avatar_color, timezone, currency')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data ?? DEFAULT_PROFILE)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
