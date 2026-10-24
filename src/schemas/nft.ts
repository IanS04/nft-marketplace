import { z } from 'zod'
import { compare } from '@/lib/money'
import type {
  EditionId, EthAmount, Nft, NftCategory, NftEdition, NftId, NftListQuery, NftListResponse, NftSortKey,
  NftSummary, NftTab,
} from '@/types'
import { pageInfoSchema } from './api'
import { BLOCKCHAINS, branded, decimalString, imageAssetSchema, isoDate } from './common'

export const NFT_PAGE_SIZE = 9
export const NFT_MAX_PAGE_SIZE = 48

export const NFT_CATEGORIES = [
  'arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis',
  'generativo', 'jogos', 'assinaturas', 'utilidade',
] as const satisfies readonly NftCategory[]

export const NFT_SORT_KEYS = ['recent', 'price_asc', 'price_desc', 'popular'] as const satisfies readonly NftSortKey[]
export const NFT_TABS = ['all', 'new', 'trending'] as const satisfies readonly NftTab[]

/* ---------- Entidades ---------- */

export const nftEditionSchema = z.object({
  id: branded<EditionId>(),
  label: z.string(),
  kind: z.enum(['limited', 'open']),
  supply: z.number().int().nonnegative().nullable(),
  available: z.number().int().nonnegative().nullable(),
  price: decimalString,
  maxPerOrder: z.number().int().positive(),
  status: z.enum(['available', 'low_stock', 'sold_out']),
}) satisfies z.ZodType<NftEdition>

export const nftSummarySchema = z.object({
  id: branded<NftId>(),
  name: z.string(),
  tokenId: z.string(),
  image: imageAssetSchema,
  price: decimalString,
  compareAtPrice: decimalString.nullable(),
  rarity: z.enum(['comum', 'raro']),
  category: z.enum(NFT_CATEGORIES),
  network: z.enum(BLOCKCHAINS),
  isFeatured: z.boolean(),
  isNew: z.boolean(),
  isTrending: z.boolean(),
  version: z.number().int().nonnegative(),
}) satisfies z.ZodType<NftSummary>

const refSchema = z.object({ id: z.string(), name: z.string() })

export const nftSchema = nftSummarySchema.extend({
  description: z.string(),
  gallery: z.array(imageAssetSchema),
  collection: refSchema,
  creator: refSchema,
  attributes: z.array(z.string()),
  rating: z.object({ average: z.number(), count: z.number().int().nonnegative() }),
  editions: z.array(nftEditionSchema),
  contractAddress: z.string(),
  royaltyPercent: z.string(),
  updatedAt: isoDate,
}) satisfies z.ZodType<Nft>

/* ---------- Listas na URL / query string ---------- */

/** Aceita array, CSV ("a,b") ou JSON ('["a","b"]', formato que o router grava na URL). */
function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null || value === '') return []
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return [value]
  const text = value.trim()
  if (text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text)
      return Array.isArray(parsed) ? parsed : [text]
    } catch {
      return [text]
    }
  }
  return text.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Ordena e remove duplicados: a mesma seleção sempre gera a mesma chave de cache. */
const normalizeList = <T extends string>(values: readonly T[]): T[] => [...new Set(values)].sort()

/** API: valor inválido é erro (422). */
const strictList = <T extends string>(item: z.ZodType<T>) =>
  z.preprocess(toArray, z.array(item)).transform(normalizeList)

/** URL: valor inválido é descartado em silêncio (link quebrado não derruba a página). */
const lenientList = <T extends string>(item: z.ZodType<T>) =>
  z.preprocess(toArray, z.array(z.unknown())).transform((values) =>
    normalizeList(values.flatMap((v) => {
      const result = item.safeParse(v)
      return result.success ? [result.data] : []
    })),
  )

const priceOrderIsValid = (p: { minPrice?: EthAmount; maxPrice?: EthAmount }) =>
  !p.minPrice || !p.maxPrice || compare(p.minPrice, p.maxPrice) <= 0

/** Contrato estrito de GET /nfts (usado pelo handler MSW). Erro → 422 VALIDATION_ERROR. */
export const nftListParamsSchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    tab: z.enum(NFT_TABS).default('all'),
    categories: strictList(z.enum(NFT_CATEGORIES)),
    networks: strictList(z.enum(BLOCKCHAINS)),
    minPrice: decimalString.optional(),
    maxPrice: decimalString.optional(),
    sort: z.enum(NFT_SORT_KEYS).default('recent'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(NFT_MAX_PAGE_SIZE).default(NFT_PAGE_SIZE),
  })
  .refine(priceOrderIsValid, {
    path: ['maxPrice'],
    message: 'O preço máximo deve ser maior ou igual ao mínimo.',
  })

/** O router faz JSON.parse dos valores: "?minPrice=1.5" chega como number. Volta a ser string antes de validar. */
const urlPrice = z
  .preprocess((v) => (typeof v === 'number' ? String(v) : v), decimalString.optional())
  .catch(undefined)

/** Search params do Router: tolerante, cada campo cai no padrão se vier inválido. */
export const nftSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  tab: z.enum(NFT_TABS).default('all').catch('all'),
  categories: lenientList(z.enum(NFT_CATEGORIES)),
  networks: lenientList(z.enum(BLOCKCHAINS)),
  minPrice: urlPrice,
  maxPrice: urlPrice,
  sort: z.enum(NFT_SORT_KEYS).default('recent').catch('recent'),
  page: z.coerce.number().int().min(1).default(1).catch(1),
})

export type NftSearch = z.infer<typeof nftSearchSchema>

/** URL → query da API (chave de cache estável). */
export function toListQuery(search: NftSearch): NftListQuery {
  const swap = !priceOrderIsValid(search)
  return {
    q: search.q || undefined,
    tab: search.tab,
    categories: normalizeList(search.categories),
    networks: normalizeList(search.networks),
    minPrice: swap ? search.maxPrice : search.minPrice,
    maxPrice: swap ? search.minPrice : search.maxPrice,
    sort: search.sort,
    page: search.page,
    pageSize: NFT_PAGE_SIZE,
  }
}

/** Query → params do Axios. Arrays viajam como CSV. */
export function toListParams(query: NftListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    tab: query.tab,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  }
  if (query.q) params.q = query.q
  if (query.categories.length) params.categories = query.categories.join(',')
  if (query.networks.length) params.networks = query.networks.join(',')
  if (query.minPrice) params.minPrice = query.minPrice
  if (query.maxPrice) params.maxPrice = query.maxPrice
  return params
}

/* ---------- Respostas ---------- */

const nftListQuerySchema = z.object({
  q: z.string().optional(),
  tab: z.enum(NFT_TABS),
  categories: z.array(z.enum(NFT_CATEGORIES)),
  networks: z.array(z.enum(BLOCKCHAINS)),
  minPrice: decimalString.optional(),
  maxPrice: decimalString.optional(),
  sort: z.enum(NFT_SORT_KEYS),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
}) satisfies z.ZodType<NftListQuery>

const facetSchema = <T extends string>(value: z.ZodType<T>) =>
  z.object({ value, count: z.number().int().nonnegative() })

export const nftListResponseSchema = z.object({
  items: z.array(nftSummarySchema),
  pageInfo: pageInfoSchema,
  facets: z.object({
    categories: z.array(facetSchema(z.enum(NFT_CATEGORIES))),
    networks: z.array(facetSchema(z.enum(BLOCKCHAINS))),
    priceRange: z.object({ min: decimalString, max: decimalString }),
  }),
  query: nftListQuerySchema,
}) satisfies z.ZodType<NftListResponse>

export const featuredNftsResponseSchema = z.object({ items: z.array(nftSummarySchema) })

export const favoritesResponseSchema = z.object({ nftIds: z.array(branded<NftId>()) })
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>

/** Parâmetro de rota `/nfts/$nftId` → NftId tipado. */
export const nftIdParamSchema = branded<NftId>()
