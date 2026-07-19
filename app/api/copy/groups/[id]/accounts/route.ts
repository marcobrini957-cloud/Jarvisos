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

type Ctx = { params: Promise<{ id: string }> }

// POST /api/copy/groups/[id]/accounts — add leader or follower account to group
export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: groupId } = await params

  // Verify group belongs to user
  const { data: group } = await admin()
    .from('copy_groups')
    .select('id')
    .eq('id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  const body = await req.json()
  const { role, nickname, mt5_login, mt5_server } = body

  if (!role || !mt5_login) {
    return NextResponse.json({ error: 'role and mt5_login are required' }, { status: 400 })
  }
  if (!['leader', 'follower'].includes(role)) {
    return NextResponse.json({ error: 'role must be leader or follower' }, { status: 400 })
  }

  // Enforce one leader per group
  if (role === 'leader') {
    const { count } = await admin()
      .from('copy_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('role', 'leader')
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'Group already has a leader account' }, { status: 409 })
    }
  }

  // Enforce follower limit based on subscription tier (shared helper, lazy-downgrade aware)
  if (role === 'follower') {
    const plan = await getUserPlan(userId)
    const maxFollowers = plan.copyFollowersEach

    const { count } = await admin()
      .from('copy_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('role', 'follower')

    if ((count ?? 0) >= maxFollowers) {
      return NextResponse.json(
        { error: `Your plan allows a maximum of ${maxFollowers} follower account${maxFollowers > 1 ? 's' : ''} per group` },
        { status: 403 }
      )
    }
  }

  const { data, error } = await admin()
    .from('copy_accounts')
    .insert({
      group_id:   groupId,
      user_id:    userId,
      role,
      nickname:   nickname ?? '',
      mt5_login:  String(mt5_login),
      mt5_server: mt5_server ?? '',
      status:     'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
