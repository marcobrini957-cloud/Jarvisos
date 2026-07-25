// Single source of truth for the MT5 EA: ea/VelquorBridge.mq5
// Copies it to the two places that must ship the same file:
//   - public/ea/  → the copy users download from the app
//   - cloudterm/  → the copy the cloud-terminal provisioner bakes into containers
// Runs on prebuild so the download and the deployed EA can never drift apart
// (they did once: public/ea was stuck at 2.21 while the source was 2.23).
//
// It also publishes the *compiled* EA (ea/VelquorBridge.ex5, built by
// scripts/build-ea.sh) so users don't have to open MetaEditor. A compiled
// binary can silently go stale against the source, so it only ships when
// ea/VelquorBridge.ex5.json records the hash of the exact .mq5 next to it —
// otherwise the binary is withheld and public/ea/manifest.json says so, which
// flips the Connect wizard back to "download the source and press F7".
import { copyFileSync, mkdirSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'

const SOURCE  = 'ea/VelquorBridge.mq5'
const TARGETS = ['public/ea/VelquorBridge.mq5', 'cloudterm/VelquorBridge.mq5']

const BINARY      = 'ea/VelquorBridge.ex5'
const BINARY_META = 'ea/VelquorBridge.ex5.json'
const PUBLIC_BIN  = 'public/ea/VelquorBridge.ex5'
const MANIFEST    = 'public/ea/manifest.json'

if (!existsSync(SOURCE)) {
  console.error(`[sync-ea] source missing: ${SOURCE}`)
  process.exit(1)
}

const source = readFileSync(SOURCE)

for (const target of TARGETS) {
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(SOURCE, target)
  console.log(`[sync-ea] ${SOURCE} → ${target}`)
}

// ── version + compiled binary ────────────────────────────────────────────────
const version = /#property\s+version\s+"([^"]+)"/.exec(source.toString('utf8'))?.[1] ?? null
const sha     = createHash('sha256').update(source).digest('hex')

let binaryOk = false
if (existsSync(BINARY) && existsSync(BINARY_META)) {
  try {
    const meta = JSON.parse(readFileSync(BINARY_META, 'utf8'))
    binaryOk = meta.sourceSha256 === sha
    if (!binaryOk) {
      console.warn(`[sync-ea] ⚠ ${BINARY} was built from a different ${SOURCE} — withholding it.`)
      console.warn('[sync-ea]   Rebuild with: npm run ea:build')
    }
  } catch {
    console.warn(`[sync-ea] ⚠ unreadable ${BINARY_META} — withholding the compiled EA.`)
  }
} else {
  console.warn(`[sync-ea] no compiled EA (${BINARY}) — users will download the source instead.`)
}

mkdirSync(dirname(PUBLIC_BIN), { recursive: true })
if (binaryOk) {
  copyFileSync(BINARY, PUBLIC_BIN)
  console.log(`[sync-ea] ${BINARY} → ${PUBLIC_BIN}`)
} else if (existsSync(PUBLIC_BIN)) {
  rmSync(PUBLIC_BIN)
  console.log(`[sync-ea] removed stale ${PUBLIC_BIN}`)
}

writeFileSync(MANIFEST, JSON.stringify({ version, binary: binaryOk, sourceSha256: sha }, null, 2) + '\n')
console.log(`[sync-ea] manifest → v${version ?? '?'} binary=${binaryOk}`)
