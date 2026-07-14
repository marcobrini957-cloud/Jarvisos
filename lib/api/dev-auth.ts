import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Shared guard + helpers for /api/dev/* admin routes.
// Auth model: the /dev console sets __dev_session (value === DEV_SECRET)
// after the password login in app/dev/actions.ts.

export function isDevAuthed(req: NextRequest): boolean {
  const secret = process.env.DEV_SECRET
  if (!secret) return false
  const cookie = req.cookies.get('__dev_session')
  return !!cookie?.value && cookie.value === secret
}

export function devUnauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Every admin action lands in admin_audit_log. Best-effort: auditing must
// never block the action itself (e.g. before the migration is run).
export async function audit(
  sb: SupabaseClient,
  action: string,
  target?: { userId?: string | null; email?: string | null },
  detail?: Record<string, unknown>
) {
  try {
    await sb.from('admin_audit_log').insert({
      action,
      target_user_id: target?.userId ?? null,
      target_email: target?.email ?? null,
      detail: detail ?? null,
    })
  } catch {}
}

// Detects "the migration hasn't been run yet" Postgres errors so routes can
// tell the UI to show the setup banner instead of a generic failure.
export function isMissingSchemaError(message?: string | null): boolean {
  if (!message) return false
  return /column .* does not exist|relation .* does not exist|could not find/i.test(message)
}
