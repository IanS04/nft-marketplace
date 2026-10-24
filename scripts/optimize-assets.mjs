// Gera os WebP servidos pela app a partir dos SVGs exportados do Figma.
// Os SVGs têm um PNG 1254×1254 embutido em base64 (~2,7 MB cada): servir assim derruba o LCP.
// Uso: pnpm assets   (rodar de novo sempre que um arquivo em assets-src/nfts mudar)
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import sharp from 'sharp'

const SRC = 'assets-src/nfts'
const OUT = 'public/assets/nfts'
const WIDTHS = [400, 800]

await mkdir(OUT, { recursive: true })

for (const file of (await readdir(SRC)).filter((f) => f.endsWith('.svg'))) {
  const svg = await readFile(join(SRC, file), 'utf8')
  const match = svg.match(/data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/=]+)/)
  if (!match) throw new Error(`${file}: nenhuma imagem embutida encontrada`)
  const source = Buffer.from(match[1], 'base64')
  const name = basename(file, '.svg')

  for (const width of WIDTHS) {
    const target = join(OUT, `${name}-${width}.webp`)
    const info = await sharp(source).resize(width, width).webp({ quality: 78 }).toFile(target)
    console.log(`${target}  ${(info.size / 1024).toFixed(0)} KB`)
  }
}
