import { markup, eth } from '@/lib/money'
import { BLOCKCHAINS } from '@/schemas/common'
import { NFT_CATEGORIES } from '@/schemas/nft'
import type {
  Blockchain, EditionId, EditionStatus, EthAmount, ImageAsset, Nft, NftCategory, NftEdition, NftId,
} from '@/types'
import { mulberry32 } from '../prng'
import { creatorForArtwork } from './creators'
import type { NftRecord } from '../db/db'

const BASE_LISTED_AT = Date.parse('2026-07-01T12:00:00.000Z')
const HOUR = 3_600_000
const REFERENCE_DATE = '2026-07-01T12:00:00.000Z'
const HEX = '0123456789abcdef'

const NETWORK_LABEL: Record<Blockchain, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

/*
 * Artes do Figma (assets-src/nfts → public/assets/nfts via `pnpm assets`). nft4 = macacos dourados de fone.
 * Alguns nomes do Figma compartilham a mesma arte (desvio documentado no ARCHITECTURE.md).
 */
const ARTWORKS = {
  nft1: 'gorila de chapéu verde e moletom roxo',
  nft2: 'macaco de óculos redondos, jaqueta college verde e colar de esmeralda',
  nft3: 'macaco de cabelo preto, terno bege e gola alta verde',
  nft4: 'macaco dourado com fones de ouvido verdes e jaqueta creme',
} as const
type Artwork = keyof typeof ARTWORKS

interface Archetype { slug: string; name: string; traits: [string, string]; artwork: Artwork }

const ARCHETYPES: Archetype[] = [
  { slug: 'emerald-ape', name: 'Emerald Ape', traits: ['Óculos', 'Esmeralda'], artwork: 'nft2' },
  { slug: 'sage-nomad', name: 'Sage Nomad', traits: ['Chapéu', 'Sálvia'], artwork: 'nft1' },
  { slug: 'neon-vessel', name: 'Neon Vessel', traits: ['Neon', 'Jaqueta'], artwork: 'nft3' },
  { slug: 'cosmic-bloom', name: 'Cosmic Bloom', traits: ['Chapéu', 'Cósmico'], artwork: 'nft1' },
  { slug: 'violet-nomad', name: 'Violet Nomad', traits: ['Moletom', 'Violeta'], artwork: 'nft1' },
  { slug: 'ivory-baron', name: 'Ivory Baron', traits: ['Terno', 'Marfim'], artwork: 'nft3' },
  { slug: 'golden-beat', name: 'Golden Beat', traits: ['Fones', 'Dourado'], artwork: 'nft4' },
  { slug: 'golden-frequency', name: 'Golden Frequency', traits: ['Fones', 'Frequência'], artwork: 'nft4' },
  { slug: 'golden-signal', name: 'Golden Signal', traits: ['Fones', 'Sinal'], artwork: 'nft4' },
]

interface Spec {
  archetype: Archetype
  token: string
  price: EthAmount
  compareAt: EthAmount | null
  rare: boolean
  network: Blockchain
  category: NftCategory
  rating: { average: number; count: number }
  /** Edição 1/1 esgotada (cenário de "edição indisponível"). */
  soldOut1of1?: boolean
  fullStock?: boolean
}

// Os 9 primeiros reproduzem nomes e preços do Figma (ordem = "listados recentemente").
const CANONICAL: Spec[] = ([
  { archetype: ARCHETYPES[0], token: '042', price: eth('1.19'), compareAt: null, rare: false, network: 'ethereum', category: 'arte-digital', rating: { average: 4.8, count: 19 } },
  { archetype: ARCHETYPES[1], token: '009', price: eth('1.69'), compareAt: null, rare: false, network: 'polygon', category: 'fotografia', rating: { average: 4.5, count: 12 } },
  { archetype: ARCHETYPES[2], token: '552', price: eth('1.99'), compareAt: eth('2.29'), rare: true, network: 'solana', category: 'arte-3d', rating: { average: 4.9, count: 31 }, soldOut1of1: true },
  { archetype: ARCHETYPES[3], token: '118', price: eth('1.29'), compareAt: null, rare: false, network: 'ethereum', category: 'musica', rating: { average: 4.2, count: 8 } },
  { archetype: ARCHETYPES[4], token: '314', price: eth('1.39'), compareAt: null, rare: false, network: 'polygon', category: 'colecionaveis', rating: { average: 4.6, count: 15 } },
  { archetype: ARCHETYPES[5], token: '088', price: eth('1.79'), compareAt: null, rare: false, network: 'ethereum', category: 'generativo', rating: { average: 4.7, count: 22 } },
  { archetype: ARCHETYPES[6], token: '207', price: eth('0.99'), compareAt: null, rare: false, network: 'solana', category: 'jogos', rating: { average: 4.1, count: 6 } },
  { archetype: ARCHETYPES[7], token: '071', price: eth('0.59'), compareAt: null, rare: false, network: 'polygon', category: 'assinaturas', rating: { average: 4.0, count: 5 } },
  { archetype: ARCHETYPES[8], token: '160', price: eth('0.39'), compareAt: null, rare: false, network: 'ethereum', category: 'utilidade', rating: { average: 3.9, count: 4 } },
] satisfies Spec[]).map((s) => ({ ...s, fullStock: true }))

const EDITION_DEFS = [
  { key: '1of1', label: '1/1', kind: 'limited', supply: 1 },
  { key: '1of10', label: '1/10', kind: 'limited', supply: 10 },
  { key: '1of50', label: '1/50', kind: 'limited', supply: 50 },
  { key: 'open', label: 'ABERTA', kind: 'open', supply: null },
] as const

const statusOf = (available: number | null): EditionStatus =>
  available === null ? 'available' : available === 0 ? 'sold_out' : available <= 3 ? 'low_stock' : 'available'

function buildEditions(nftId: NftId, price: EthAmount, spec: Spec, rng: () => number): NftEdition[] {
  // Sempre consome o PRNG na mesma ordem → fixtures determinísticas.
  const rolled = { '1of1': rng() < 0.25 ? 0 : 1, '1of10': Math.floor(rng() * 11), '1of50': Math.floor(rng() * 51) }

  return EDITION_DEFS.map((def) => {
    let available: number | null = def.supply === null ? null : rolled[def.key as keyof typeof rolled]
    if (spec.fullStock && def.supply !== null) available = def.supply
    if (spec.soldOut1of1 && def.key === '1of1') available = 0
    return {
      id: `${nftId}--${def.key}` as EditionId,
      label: def.label,
      kind: def.kind,
      supply: def.supply,
      available,
      price,
      maxPerOrder: def.supply === null ? 10 : Math.min(def.supply, 10),
      status: statusOf(available),
    }
  })
}

function buildRecord(spec: Spec, index: number, rng: () => number): NftRecord {
  const { archetype } = spec
  const id = `${archetype.slug}-${spec.token}` as NftId
  const image: ImageAsset = {
    url: `/assets/nfts/${archetype.artwork}-800.webp`,
    srcSet: `/assets/nfts/${archetype.artwork}-400.webp 400w, /assets/nfts/${archetype.artwork}-800.webp 800w`,
    alt: `${archetype.name} #${spec.token}: ilustração de ${ARTWORKS[archetype.artwork]}`,
    width: 800,
    height: 800,
  }
  const creator = creatorForArtwork(archetype.artwork)
  const contractAddress = `0x${Array.from({ length: 40 }, () => HEX[Math.floor(rng() * 16)]).join('')}`

  const nft: Nft = {
    id,
    name: `${archetype.name} #${spec.token}`,
    tokenId: spec.token.padStart(4, '0'),
    image,
    price: spec.price,
    compareAtPrice: spec.compareAt,
    rarity: spec.rare ? 'raro' : 'comum',
    category: spec.category,
    network: spec.network,
    isFeatured: index < 3,
    isNew: index % 5 === 1,
    isTrending: index % 4 === 0,
    version: 1,
    description:
      `Um colecionável digital da coleção Kurio Apes, finalizado à mão e verificado na ` +
      `${NETWORK_LABEL[spec.network]}, com arte desbloqueável e acesso para colecionadores.`,
    gallery: [image, image, image, image].map((img, i) => ({
      ...img,
      alt: `${img.alt} (vista ${i + 1} de 4)`,
    })),
    collection: { id: 'kurio-apes', name: 'Kurio Apes' },
    creator: { id: creator.id, name: creator.name },
    attributes: [...archetype.traits, ...(spec.rare ? ['Raro'] : [])],
    rating: spec.rating,
    editions: buildEditions(id, spec.price, spec, rng),
    contractAddress,
    royaltyPercent: creator.royaltyPercent,
    updatedAt: REFERENCE_DATE,
  }

  return {
    nft,
    listedAt: BASE_LISTED_AT - index * HOUR,
    popularity: spec.rating.count * 10 + Math.floor(rng() * 10),
  }
}

export function buildNftFixtures(total = 36): NftRecord[] {
  const rng = mulberry32(42)
  const usedIds = new Set(CANONICAL.map((s) => `${s.archetype.slug}-${s.token}`))
  const specs: Spec[] = [...CANONICAL]

  for (let i = specs.length; i < total; i++) {
    const archetype = ARCHETYPES[i % ARCHETYPES.length]
    let token = ''
    do { token = String(100 + Math.floor(rng() * 890)) } while (usedIds.has(`${archetype.slug}-${token}`))
    usedIds.add(`${archetype.slug}-${token}`)

    const price = eth(((20 + Math.floor(rng() * 380)) / 100).toFixed(2))
    specs.push({
      archetype,
      token,
      price,
      compareAt: rng() < 0.18 ? markup(price, 15) : null,
      rare: rng() < 0.2,
      network: BLOCKCHAINS[Math.floor(rng() * BLOCKCHAINS.length)],
      category: NFT_CATEGORIES[(i + 3) % NFT_CATEGORIES.length],
      rating: { average: Math.round((3.8 + rng() * 1.2) * 10) / 10, count: 3 + Math.floor(rng() * 58) },
    })
  }

  return specs.map((spec, index) => buildRecord(spec, index, rng))
}
