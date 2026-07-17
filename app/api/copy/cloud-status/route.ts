import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthUserId } from '@/lib/api/auth'
import { accountSlot, userSlots, bridgeConfigured } from '@/lib/api/copy-cloud'

// Which of the user's copy accounts are hosted in a VELQUOR cloud terminal?
// Slot names are derived from account ids, so the provisioner's slot list maps
// straight back to accounts. Also reports the user's main terminal login so
// the UI can offer password-free hosting for that account.

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!bridgeConfigured()) {
    return NextResponse.json({ hosted_account_ids: [], main_terminal: null })
  }

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const [slots, accounts, profile] = await Promise.all([
    userSlots(userId),
    sb.from('copy_accounts').select('id').eq('user_id', userId),
    sb.from('user_profiles').select('mt5_login, ea_connected').eq('id', userId).maybeSingle(),
  ])

  const slotSet = new Set(slots.slots)
  const hosted = (accounts.data ?? [])
    .filter(a => slotSet.has(accountSlot(a.id)))
    .map(a => a.id)

  return NextResponse.json({
    hosted_account_ids: hosted,
    main_terminal: slotSet.has('main')
      ? { login: profile.data?.mt5_login ?? null, ea_connected: profile.data?.ea_connected ?? false }
      : null,
    terminals_used: slots.count,
  })
}
