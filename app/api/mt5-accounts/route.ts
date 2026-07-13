import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/api/auth'

export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = process.env.METAAPI_TOKEN
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  try {
    const res = await fetch(
      'https://mt-provisioning-api-v1.agiliumtrade.ai/users/current/accounts?limit=10',
      { headers: { 'auth-token': token }, cache: 'no-store' }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
