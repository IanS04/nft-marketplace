import type {
  Blockchain, EditionId, EthAmount, ISODateString, ImageAsset, NftId,
} from './common'
import type { Paginated } from './api'

export type NftCategory =
  | 'arte-digital' | 'fotografia' | 'musica' | 'arte-3d' | 'colecionaveis'
  | 'generativo' | 'jogos' | 'assinaturas' | 'utilidade'

export type NftRarity = 'comum' | 'raro'
export type EditionKind = 'limited' | 'open'
export type EditionStatus = 'available' | 'low_stock' | 'sold_out'

export interface NftEdition {
  id: EditionId
  label: string                 // "1/1", "1/10", "1/50", "ABERTA"
  kind: EditionKind
  supply: number | null         // null = edição aberta
  available: number | null      // null = ilimitada
  price: EthAmount
  maxPerOrder: number
  status: EditionStatus
}

export interface NftSummary {
  id: NftId
  name: string                  // "Emerald Ape #042"
  tokenId: string               // "0042"
  image: ImageAsset
  price: EthAmount              // menor preço entre as edições disponíveis
  compareAtPrice: EthAmount | null // preço riscado (ex.: 2.29 ETH)
  rarity: NftRarity
  category: NftCategory
  network: Blockchain
  isFeatured: boolean
  isNew: boolean
  isTrending: boolean
  version: number               // monotônica: guarda de eventos nft.updated
}

export interface Nft extends NftSummary {
  description: string
  gallery: ImageAsset[]
  collection: { id: string; name: string }  // "Kurio Apes"
  creator: { id: string; name: string }
  attributes: string[]          // ["Óculos", "Esmeralda", "Raro"]
  rating: { average: number; count: number }
  editions: NftEdition[]
  contractAddress: string
  royaltyPercent: string        // "5" (inteiro/decimal em string)
  updatedAt: ISODateString
}

/* ---------- Listagem: tudo isso vive na URL ---------- */

export type NftSortKey = 'recent' | 'price_asc' | 'price_desc' | 'popular'
export type NftTab = 'all' | 'new' | 'trending'

export interface NftListQuery {
  q?: string
  tab: NftTab
  categories: NftCategory[]
  networks: Blockchain[]
  minPrice?: EthAmount
  maxPrice?: EthAmount
  sort: NftSortKey
  page: number
  pageSize: number
}

export interface Facet<T extends string> {
  value: T
  count: number
}

export interface NftListFacets {
  categories: Facet<NftCategory>[]
  networks: Facet<Blockchain>[]
  priceRange: { min: EthAmount; max: EthAmount }
}

export interface NftListResponse extends Paginated<NftSummary> {
  facets: NftListFacets
  query: NftListQuery           // eco dos parâmetros: permite descartar respostas obsoletas
}