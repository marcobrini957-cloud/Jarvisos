#!/usr/bin/env node
/**
 * Re-encode every stored trade screenshot to WebP and repoint the trades rows.
 *
 * The bucket held a mix: JPEGs written by the EA path (~53 kB each) and PNGs
 * from before the upload route transcoded anything (~225 kB each). Both are
 * larger than they need to be — a dark chart of flat colour is the best case
 * for a modern codec, and at 2x magnification WebP q72 is indistinguishable
 * from the original on the price axis and the candle wicks.
 *
 * Safe to re-run: it skips anything already `.webp`, and only deletes the old
 * object once the new one is uploaded AND the trades row points at it.
 *
 *   node scripts/shrink-screenshots.mjs           # dry run, changes nothing
 *   node scripts/shrink-screenshots.mjs --apply   # do it
 */
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const APPLY = process.argv.includes('--apply')
const BUCKET = 'trade-screenshots'

// .env.local is not loaded for a bare node script.
for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const kb = n => (n / 1024).toFixed(1) + ' kB'

/** Every object in the bucket, walking the folder tree Supabase exposes. */
async function walk(prefix = '') {
  const out = []
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error) throw new Error(`list ${prefix}: ${error.message}`)
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id === null) out.push(...await walk(full))     // folder
    else out.push({ path: full, size: Number(entry.metadata?.size ?? 0) })
  }
  return out
}

const SLOTS = ['screenshot_open_url', 'screenshot_close_url', 'screenshot_user_url']

async function main() {
  console.log(APPLY ? '── APPLYING ──' : '── DRY RUN (pass --apply to write) ──')
  const files = await walk()
  const targets = files.filter(f => !f.path.endsWith('.webp'))
  const before = files.reduce((a, f) => a + f.size, 0)

  console.log(`${files.length} objects, ${kb(before)} total · ${targets.length} to convert\n`)

  let after = files.filter(f => f.path.endsWith('.webp')).reduce((a, f) => a + f.size, 0)
  let done = 0, failed = 0

  for (const f of targets) {
    const newPath = f.path.replace(/\.(jpe?g|png)$/i, '.webp')
    try {
      const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(f.path)
      if (dlErr) throw new Error(dlErr.message)
      const src = Buffer.from(await blob.arrayBuffer())

      // Same settings the live encoders use, so backfilled and new files match.
      const out = await sharp(src)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 72, effort: 4 })
        .toBuffer()

      after += out.length
      const saved = Math.round((1 - out.length / f.size) * 100)
      console.log(`  ${kb(f.size).padStart(9)} -> ${kb(out.length).padStart(9)}  -${String(saved).padStart(2)}%  ${f.path}`)
      if (!APPLY) { done++; continue }

      const { error: upErr } = await sb.storage
        .from(BUCKET).upload(newPath, out, { contentType: 'image/webp', upsert: true })
      if (upErr) throw new Error(`upload: ${upErr.message}`)

      const oldUrl = sb.storage.from(BUCKET).getPublicUrl(f.path).data.publicUrl
      const newUrl = sb.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl

      // Repoint whichever slot referenced the old object.
      let repointed = 0
      for (const col of SLOTS) {
        const { data: rows } = await sb.from('trades').select('id').eq(col, oldUrl)
        for (const r of rows ?? []) {
          await sb.from('trades').update({ [col]: newUrl }).eq('id', r.id)
          repointed++
        }
      }

      // Only now is the old object safe to drop.
      await sb.storage.from(BUCKET).remove([f.path])
      console.log(`             repointed ${repointed} row(s), old object removed`)
      done++
    } catch (err) {
      failed++
      console.log(`  FAILED ${f.path}: ${err.message}`)
      after += f.size
    }
  }

  console.log(`\n${done} converted, ${failed} failed`)
  console.log(`bucket ${kb(before)} -> ${kb(after)}  (-${Math.round((1 - after / before) * 100)}%)`)
  if (!APPLY) console.log('\nNothing was written. Re-run with --apply.')
}

main().catch(e => { console.error(e); process.exit(1) })
