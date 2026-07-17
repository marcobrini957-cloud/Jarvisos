import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { accountSlot, provisioner, bridgeConfigured } from '@/lib/api/copy-cloud'

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

// PATCH /api/copy/groups/[id] — update group settings
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['name', 'lot_mode', 'lot_fixed', 'lot_multiplier', 'max_lot', 'active'] as const
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of allowed) {
    if (body[k] !== undefined) update[k] = body[k]
  }

  const { data, error } = await admin()
    .from('copy_groups')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// DELETE /api/copy/groups/[id] — delete a group
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Collect the group's accounts BEFORE the delete cascades them away, so any
  // hosted cloud terminals can be stopped too.
  const { data: accounts } = await admin()
    .from('copy_accounts')
    .select('id')
    .eq('group_id', id)
    .eq('user_id', userId)

  const { error } = await admin()
    .from('copy_groups')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (bridgeConfigured() && accounts?.length) {
    await Promise.allSettled(
      accounts.map(a => provisioner(`/provision/${userId}?slot=${accountSlot(a.id)}`, { method: 'DELETE' }))
    )
  }

  return NextResponse.json({ ok: true })
}
