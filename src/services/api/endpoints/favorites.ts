import { favoritesResponseSchema, type FavoritesResponse } from '@/schemas/nft'
import type { NftId } from '@/types'
import { http } from '../http'

const path = (id: NftId) => `/favorites/${encodeURIComponent(id)}`

export const favoritesApi = {
  async list(signal?: AbortSignal): Promise<FavoritesResponse> {
    const { data } = await http.get('/favorites', { signal })
    return favoritesResponseSchema.parse(data)
  },
  // PUT e DELETE são idempotentes e devolvem a lista final (facilita o rollback/sync do cache)
  async add(id: NftId): Promise<FavoritesResponse> {
    const { data } = await http.put(path(id))
    return favoritesResponseSchema.parse(data)
  },
  async remove(id: NftId): Promise<FavoritesResponse> {
    const { data } = await http.delete(path(id))
    return favoritesResponseSchema.parse(data)
  },
}