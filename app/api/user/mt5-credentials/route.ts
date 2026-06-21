import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PROVISION_BASE = 'https://mt-provisioning-api-v1.agiliumtrade.ai'

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    return user?.id ?? null
  } catch { return null }
}

// POST /api/user/mt5-credentials
// Body: { login, password, server }
// 1. Provisions (or updates) user's MT5 account under Jarvis's MetaAPI subscription
// 2. Stores the resulting MetaAPI account UUID in user_profiles
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { login, password, server } = await req.json()
    if (!login || !password || !server) {
      return NextResponse.json({ error: 'MT5 login, password, and server are required.' }, { status: 400 })
    }

    const token = process.env.METAAPI_TOKEN
    if (!token) return NextResponse.json({ error: 'MetaAPI not configured on server.' }, { status: 500 })

    const supabase = await createClient()

    // Check if user already has a MetaAPI account provisioned
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('mt5_account_id')
      .eq('id', userId)
      .single()

    let metaAccountId: string | null = existing?.mt5_account_id ?? null

    if (metaAccountId) {
      // Update credentials on existing MetaAPI account
      const updateRes = await fetch(`${PROVISION_BASE}/users/current/accounts/${metaAccountId}`, {
        method: 'PUT',
        headers: { 'auth-token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password, server, platform: 'mt5', name: `Velquor — ${login}`, type: 'cloud' }),
      })
      if (!updateRes.ok) {
        // If account not found in MetaAPI (e.g. was deleted), provision fresh
        if (updateRes.status === 404) {
          metaAccountId = null
        } else {
          const text = await updateRes.text()
          console.error('[mt5-credentials] update failed:', text)
          // Non-fatal — continue with stored ID
        }
      }
    }

    if (!metaAccountId) {
      // Provision a new MT5 account under Jarvis's MetaAPI subscription
      const provRes = await fetch(`${PROVISION_BASE}/users/current/accounts`, {
        method: 'POST',
        headers: { 'auth-token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login,
          password,
          server,
          platform: 'mt5',
          name: `Velquor — ${login}`,
          type: 'cloud',
        }),
      })

      if (!provRes.ok) {
        const text = await provRes.text()
        console.error('[mt5-credentials] provision failed:', provRes.status, text)
        return NextResponse.json(
          { error: `Could not connect to MetaAPI: ${provRes.status}. Check your login, password, and server name.` },
          { status: 400 }
        )
      }

      const provData = await provRes.json() as { id: string }
      metaAccountId = provData.id
    }

    // Save MT5 details to user_profiles
    const { error: saveErr } = await supabase
      .from('user_profiles')
      .upsert({
        id:              userId,
        mt5_account_id:  metaAccountId,
        mt5_login:       login,
        mt5_server:      server,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'id' })

    if (saveErr) {
      console.error('[mt5-credentials] save error:', saveErr)
      return NextResponse.json({ error: 'Connected to MetaAPI but failed to save. Try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, metaAccountId })

  } catch (err) {
    console.error('[mt5-credentials]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

// GET /api/user/mt5-credentials — returns current connection status
export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return NextResponse.json({ connected: false })

    const supabase = await createClient()
    const { data } = await supabase
      .from('user_profiles')
      .select('mt5_account_id, mt5_login, mt5_server')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      connected: !!data?.mt5_account_id,
      login:     data?.mt5_login ?? null,
      server:    data?.mt5_server ?? null,
    })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
