import DashboardShell from '@/components/dashboard/DashboardShell'
import { TAB_QUERY_KEY, tabFromSlug } from '@/components/dashboard/tabs'

/**
 * A first visit lands on the dashboard, like every other visit.
 *
 * It used to be intercepted and sent through a four-screen setup wizard, and
 * accounts arriving with a cloud terminal already running were sent through it
 * too — asked to connect a MetaTrader account that was, at that moment,
 * connected and syncing. A gate that fires on someone who has already passed
 * it is worse than no gate.
 *
 * Setup lives on Home now, as a checklist that reads the account and ticks
 * itself (components/dashboard/GettingStarted): already connected means step
 * one is already done, with nothing to dismiss.
 */
export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Resolve ?tab= on the server so the requested section is in the very first
  // paint. Doing it client-side would render Home, then swap.
  const sp   = await searchParams
  const raw  = sp[TAB_QUERY_KEY]
  const slug = Array.isArray(raw) ? raw[0] : raw
  const { id, settings } = tabFromSlug(slug)

  return <DashboardShell initialTab={id} initialSettings={settings} />
}
