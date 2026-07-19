import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET /api/copy/groups/[id]/log — recent copy execution log
export async function GET(_req: NextRequest, { params }: Ctx) {
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

  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await admin()
    .from('copy_log')
    .select(`
      id, status, follower_ticket, follower_lots, error_message, executed_at, created_at,
      copy_accounts!inner(nickname, mt5_login, role),
      copy_signals!inner(signal_type, leader_ticket, symbol, trade_type, lot_size, open_price)
    `)
    .eq('copy_signals.group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
