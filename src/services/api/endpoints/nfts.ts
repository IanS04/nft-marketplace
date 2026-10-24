import { featuredNftsResponseSchema, nftListResponseSchema, nftSchema, toListParams } from '@/schemas/nft'
import type { Nft, NftId, NftListQuery, NftListResponse, NftSummary } from '@/types'
import { http } from '../http'

export const nftsApi = {
  async list(query: NftListQuery, signal?: AbortSignal): Promise<NftListResponse> {
    const { data } = await http.get('/nfts', { params: toListParams(query), signal })
    return nftListResponseSchema.parse(data)
  },

  async featured(signal?: AbortSignal): Promise<NftSummary[]> {
    const { data } = await http.get('/nfts/featured', { signal })
    return featuredNftsResponseSchema.parse(data).items
  },

  async get(id: NftId, signal?: AbortSignal): Promise<Nft> {
    const { data } = await http.get(`/nfts/${encodeURIComponent(id)}`, { signal })
    return nftSchema.parse(data)
  },
}
