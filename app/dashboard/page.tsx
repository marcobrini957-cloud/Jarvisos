import { redirect } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/api/auth'
import DashboardShell from '@/components/dashboard/DashboardShell'

/**
 * The four-step setup flow at /onboarding shipped with the product and nothing
 * ever linked to it. A brand-new account landed here instead: an empty
 * dashboard, no MT5 connection, nothing telling them to make one, and a modal
 * that said "Welcome back". Send a first visit through setup, once.
 *
 * Server-side on purpose — a client redirect would render the empty dashboard
 * first and then yank it away.
 */
export default async function DashboardPage() {
  const user = await getAuthUser()

  if (user) {
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data, error } = await db
      .from('user_profiles')
      .select('onboarded_at')
      .eq('id', user.id)
      .maybeSingle()

    // Fail open. A missing column or a transient error must never keep someone
    // out of their own dashboard — the worst case of skipping the check is that
    // a user misses a wizard they can still reach from Settings.
    if (!error && data && !data.onboarded_at) redirect('/onboarding')
  }

  return <DashboardShell />
}
