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

type Ctx = { params: Promise<{ id: string; accountId: string }> }

// PATCH /api/copy/groups/[id]/accounts/[accountId] — update account (pause/resume)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: groupId, accountId } = await params
  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.status !== undefined) update.status = body.status
  if (body.nickname !== undefined) update.nickname = body.nickname

  const { data, error } = await admin()
    .from('copy_accounts')
    .update(update)
    .eq('id', accountId)
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// DELETE /api/copy/groups/[id]/accounts/[accountId] — remove account from group
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: groupId, accountId } = await params
  const { error } = await admin()
    .from('copy_accounts')
    .delete()
    .eq('id', accountId)
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If this account had a hosted cloud terminal, stop it — otherwise the
  // container would keep running (and keep a slot) for a deleted account.
  // Best-effort: the main terminal is never touched here (its slot is 'main').
  if (bridgeConfigured()) {
    await provisioner(`/provision/${userId}?slot=${accountSlot(accountId)}`, { method: 'DELETE' }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
