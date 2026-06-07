import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/user/mt5-credentials
// Saves MT5 credentials to Supabase AND attempts to provision MetaAPI account
export async function POST(req: NextRequest) {
  try {
    const { accountId, investorPassword, server } = await req.json()

    if (!accountId || !investorPassword || !server) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Upsert into user_profile (single-user app)
    const { data: existing } = await supabase
      .from('user_profile')
      .select('id')
      .limit(1)
      .single()

    if (existing) {
      await supabase.from('user_profile').update({
        mt5_account_id:  accountId,
        mt5_investor_pw: investorPassword,
        mt5_server:      server,
      }).eq('id', existing.id)
    } else {
      await supabase.from('user_profile').insert({
        display_name:    'Marco',
        mt5_account_id:  accountId,
        mt5_investor_pw: investorPassword,
        mt5_server:      server,
      })
    }

    // Optionally try to provision MetaAPI account if token is available
    const metaApiToken = process.env.METAAPI_TOKEN
    if (metaApiToken && metaApiToken !== 'your_metaapi_token_paste_here') {
      try {
        const provisionRes = await fetch('https://mt-provisioning-api-v1.agiliumtrade.ai/users/current/accounts', {
          method: 'POST',
          headers: {
            'auth-token':   metaApiToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            login:    accountId,
            password: investorPassword,
            server:   server,
            platform: 'mt5',
            name:     'Marco — Blueberry Markets',
            type:     'cloud',
          }),
        })

        if (provisionRes.ok) {
          const { id: metaAccountId } = await provisionRes.json()
          // Save the MetaAPI account UUID back to profile
          const { data: profile } = await supabase.from('user_profile').select('id').limit(1).single()
          if (profile) {
            await supabase.from('user_profile').update({ mt5_account_id: metaAccountId }).eq('id', profile.id)
          }
          return NextResponse.json({ ok: true, metaAccountId, provisioned: true })
        }
      } catch (e) {
        console.error('[MetaAPI provision]', e)
        // Non-fatal — user can enter MetaAPI UUID manually
      }
    }

    return NextResponse.json({ ok: true, provisioned: false })
  } catch (err: unknown) {
    console.error('[mt5-credentials]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save' },
      { status: 500 }
    )
  }
}
