import { NextRequest, NextResponse } from 'next/server'
import { isDevAuthed, devUnauthorized, serviceClient, isMissingSchemaError } from '@/lib/api/dev-auth'

// GET /api/dev/audit — last 100 admin actions
export async function GET(req: NextRequest) {
  if (!isDevAuthed(req)) return devUnauthorized()
  const sb = serviceClient()

  const { data, error } = await sb
    .from('admin_audit_log')
    .select('id, action, target_user_id, target_email, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    if (isMissingSchemaError(error.message)) {
      return NextResponse.json({ entries: [], schemaPending: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entries: data ?? [], schemaPending: false })
}
