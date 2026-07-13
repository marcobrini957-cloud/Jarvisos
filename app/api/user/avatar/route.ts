import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api/auth'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    if (!file.type.startsWith('image/'))
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })

    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: 'File too large — max 2 MB' }, { status: 400 })

    const ext      = file.type === 'image/png' ? 'png' : 'jpg'
    const path     = `${user.id}/avatar.${ext}`
    const buffer   = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    // Bust cache by appending timestamp
    const avatarUrl = `${publicUrl}?t=${Date.now()}`

    await supabase
      .from('user_profiles')
      .upsert({ id: user.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    return NextResponse.json({ url: avatarUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`])

    await supabase
      .from('user_profiles')
      .upsert({ id: user.id, avatar_url: null, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
