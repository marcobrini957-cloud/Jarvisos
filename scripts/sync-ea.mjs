// Single source of truth for the MT5 EA: ea/VelquorBridge.mq5
// Copies it to the two places that must ship the same file:
//   - public/ea/  → the copy users download from the app
//   - cloudterm/  → the copy the cloud-terminal provisioner bakes into containers
// Runs on prebuild so the download and the deployed EA can never drift apart
// (they did once: public/ea was stuck at 2.21 while the source was 2.23).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

const SOURCE = 'ea/VelquorBridge.mq5'
const TARGETS = ['public/ea/VelquorBridge.mq5', 'cloudterm/VelquorBridge.mq5']

if (!existsSync(SOURCE)) {
  console.error(`[sync-ea] source missing: ${SOURCE}`)
  process.exit(1)
}

for (const target of TARGETS) {
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(SOURCE, target)
  console.log(`[sync-ea] ${SOURCE} → ${target}`)
}
