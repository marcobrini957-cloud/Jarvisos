import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src  = readFileSync(join(root, 'public/brand/logo-icon.svg'))

const sizes = [
  { name: 'logo-icon-1024.png', size: 1024 },
  { name: 'logo-icon-512.png',  size: 512  },
  { name: 'logo-icon-192.png',  size: 192  },
  { name: 'logo-icon-64.png',   size: 64   },
  { name: 'favicon.png',        size: 32   },
]

for (const { name, size } of sizes) {
  const out = join(root, 'public/brand', name)
  await sharp(src).resize(size, size).png({ compressionLevel: 9 }).toFile(out)
  console.log(`✓ ${name} (${size}×${size})`)
}

console.log('\nAll PNGs exported to public/brand/')
