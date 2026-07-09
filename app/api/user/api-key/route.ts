import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('velquor_api_key, ea_connected, ea_last_seen, ea_version, ea_broker')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json({
    api_key:      data.velquor_api_key,
    ea_connected: data.ea_connected   ?? false,
    ea_last_seen: data.ea_last_seen   ?? null,
    ea_version:   data.ea_version     ?? null,
    ea_broker:    data.ea_broker      ?? null,
  })
}
