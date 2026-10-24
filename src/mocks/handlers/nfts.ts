import { http, HttpResponse } from 'msw'
import { compare, ZERO } from '@/lib/money'
import { nftListParamsSchema, NFT_CATEGORIES } from '@/schemas/nft'
import { BLOCKCHAINS } from '@/schemas/common'
import type { EthAmount, Nft, NftListQuery, NftListResponse, NftSortKey, NftSummary } from '@/types'
import { apiUrl } from '../api-path'
import { withConditions } from '../chaos'
import { mockDb, type NftRecord } from '../db/db'
import { apiError, validationError } from '../http-utils'

type Omitted = 'categories' | 'networks' | 'price'

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function matches(rec: NftRecord, q: NftListQuery, omit: Omitted[] = []): boolean {
  const n = rec.nft
  if (q.tab === 'new' && !n.isNew) return false
  if (q.tab === 'trending' && !n.isTrending) return false
  if (q.q) {
    const haystack = normalize(`${n.name} ${n.collection.name} ${n.attributes.join(' ')} ${n.tokenId}`)
    if (!haystack.includes(normalize(q.q))) return false
  }
  if (!omit.includes('categories') && q.categories.length && !q.categories.includes(n.category)) return false
  if (!omit.includes('networks') && q.networks.length && !q.networks.includes(n.network)) return false
  if (!omit.includes('price')) {
    if (q.minPrice && compare(n.price, q.minPrice) < 0) return false
    if (q.maxPrice && compare(n.price, q.maxPrice) > 0) return false
  }
  return true
}

function sortRecords(records: NftRecord[], sort: NftSortKey): NftRecord[] {
  const byId = (a: NftRecord, b: NftRecord) => (a.nft.id < b.nft.id ? -1 : 1)
  const sorters: Record<NftSortKey, (a: NftRecord, b: NftRecord) => number> = {
    recent: (a, b) => b.listedAt - a.listedAt || byId(a, b),
    price_asc: (a, b) => compare(a.nft.price, b.nft.price) || byId(a, b),
    price_desc: (a, b) => compare(b.nft.price, a.nft.price) || byId(a, b),
    popular: (a, b) => b.popularity - a.popularity || byId(a, b),
  }
  return [...records].sort(sorters[sort])
}

function priceRange(records: NftRecord[]): { min: EthAmount; max: EthAmount } {
  if (!records.length) return { min: ZERO, max: ZERO }
  const prices = records.map((r) => r.nft.price)
  return {
    min: prices.reduce((a, b) => (compare(a, b) <= 0 ? a : b)),
    max: prices.reduce((a, b) => (compare(a, b) >= 0 ? a : b)),
  }
}

// Faceting padrão: cada faceta ignora o próprio filtro, mas respeita os demais.
function buildFacets(all: NftRecord[], q: NftListQuery): NftListResponse['facets'] {
  const forCategories = all.filter((r) => matches(r, q, ['categories']))
  const forNetworks = all.filter((r) => matches(r, q, ['networks']))
  return {
    categories: NFT_CATEGORIES.map((value) => ({
      value,
      count: forCategories.filter((r) => r.nft.category === value).length,
    })),
    networks: BLOCKCHAINS.map((value) => ({
      value,
      count: forNetworks.filter((r) => r.nft.network === value).length,
    })),
    priceRange: priceRange(all), // faixa global: limites estáveis para o slider
  }
}

export function toSummary(n: Nft): NftSummary {
  const { id, name, tokenId, image, price, compareAtPrice, rarity, category, network, isFeatured, isNew, isTrending, version } = n
  return { id, name, tokenId, image, price, compareAtPrice, rarity, category, network, isFeatured, isNew, isTrending, version }
}

export const nftHandlers = [
  http.get(apiUrl('/nfts'), withConditions(({ request }) => {
    const parsed = nftListParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return validationError(parsed.error)

    const query: NftListQuery = { ...parsed.data, q: parsed.data.q || undefined }
    const all = mockDb.read().nfts
    const filtered = sortRecords(all.filter((r) => matches(r, query)), query.sort)

    const total = filtered.length
    const start = (query.page - 1) * query.pageSize
    const body: NftListResponse = {
      items: filtered.slice(start, start + query.pageSize).map((r) => toSummary(r.nft)),
      // página além do fim devolve items [] (o cliente decide voltar à última página)
      pageInfo: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
      facets: buildFacets(all, query),
      query,
    }
    return HttpResponse.json(body)
  })),

  // Precisa vir ANTES de /nfts/:nftId (o MSW usa o primeiro handler que casar).
  http.get(apiUrl('/nfts/featured'), withConditions(() => {
    const items = mockDb.read().nfts.filter((r) => r.nft.isFeatured).map((r) => toSummary(r.nft))
    return HttpResponse.json({ items })
  })),

  http.get(apiUrl('/nfts/:nftId'), withConditions(({ params }) => {
    const rec = mockDb.read().nfts.find((r) => r.nft.id === String(params.nftId))
    if (!rec) return apiError('NOT_FOUND', 'NFT não encontrado.', 404)
    return HttpResponse.json(rec.nft)
  })),
]