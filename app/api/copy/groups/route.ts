import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getUserPlan } from '@/lib/api/tier'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => { try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
  const { data: { user } } = await sb.auth.getUser()
  return user?.id ?? null
}

function admin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// GET /api/copy/groups — list all groups for the current user
export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin()
    .from('copy_groups')
    .select(`
      id, name, lot_mode, lot_fixed, lot_multiplier, max_lot, active, created_at,
      copy_accounts(id, role, nickname, mt5_login, mt5_server, status, last_seen_at)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/copy/groups — create a new copy group
export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Subscription gating — shared tier helper (honors reward expiry / lazy downgrade)
  const plan = await getUserPlan(userId)
  if (plan.copyGroups < 1) {
    return NextResponse.json({ error: 'Copy trading requires Pro or Ultra plan' }, { status: 403 })
  }

  // Count existing groups
  const { count } = await admin()
    .from('copy_groups')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= plan.copyGroups) {
    return NextResponse.json(
      { error: `Your plan allows a maximum of ${plan.copyGroups} copy group${plan.copyGroups > 1 ? 's' : ''}` },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { data, error } = await admin()
    .from('copy_groups')
    .insert({
      user_id:        userId,
      name:           body.name ?? 'Copy Group',
      lot_mode:       body.lot_mode ?? 'proportional',
      lot_fixed:      body.lot_fixed ?? 0.01,
      lot_multiplier: body.lot_multiplier ?? 1.0,
      max_lot:        body.max_lot ?? 10.0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
