import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserId } from '@/lib/api/auth'

const SLOT_FIELDS: Record<string, string> = {
  open:  'screenshot_open_url',
  close: 'screenshot_close_url',
  user:  'screenshot_user_url',
}

// POST /api/trades/:id/screenshot
// Body: FormData with file (image) and slot ('user' | 'open' | 'close').
// 'user' is the trader's own chart (TradingView etc.); open/close are normally
// written by the EA via the bridge, but stay accepted here for manual fixes.
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
    const slot = (form.get('slot') as string) || 'user'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    const field = SLOT_FIELDS[slot]
    if (!field) return NextResponse.json({ error: 'Bad slot' }, { status: 400 })

    // Everything stored as JPEG — phone/TradingView PNGs are routinely 1-3MB,
    // the JPEG lands at ~100-200KB with no visible loss on charts.
    let buffer: Buffer
    try {
      buffer = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate() // honour EXIF orientation from phone photos
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer()
    } catch {
      return NextResponse.json({ error: 'Not a readable image' }, { status: 400 })
    }

    const path = `trades/${id}/${slot}_${Date.now()}.jpg`

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
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(path)

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
