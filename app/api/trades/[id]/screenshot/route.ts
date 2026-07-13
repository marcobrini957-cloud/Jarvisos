import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserId } from '@/lib/api/auth'

// POST /api/trades/:id/screenshot
// Body: FormData with file (image) and slot ('open' | 'close')
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const form = await req.formData()
    const file = form.get('file') as File | null
    const slot = (form.get('slot') as string) || 'open'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext      = file.name.split('.').pop() ?? 'png'
    const path     = `trades/${id}/${slot}_${Date.now()}.${ext}`
    const buffer   = Buffer.from(await file.arrayBuffer())

    const supabase = await createClient()

    // Verify the trade belongs to the requesting user before touching storage
    const { data: owned } = await supabase
      .from('trades')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await supabase.storage.createBucket('trade-screenshots', { public: true }).catch(() => {})

    const { error: uploadError } = await supabase.storage
      .from('trade-screenshots')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(path)

    const field = slot === 'open' ? 'screenshot_open_url' : 'screenshot_close_url'
    await supabase
      .from('trades')
      .update({ [field]: publicUrl, screenshot_missing: false })
      .eq('id', id)
      .eq('user_id', userId)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
