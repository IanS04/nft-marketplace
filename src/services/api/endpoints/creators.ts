import { creatorListSchema, creatorSchema } from '@/schemas/creator'
import type { Creator, CreatorSummary } from '@/types'
import { http } from '../http'

export const creatorsApi = {
  async list(signal?: AbortSignal): Promise<CreatorSummary[]> {
    const { data } = await http.get('/creators', { signal })
    return creatorListSchema.parse(data).items
  },
  async get(id: string, signal?: AbortSignal): Promise<Creator> {
    const { data } = await http.get(`/creators/${encodeURIComponent(id)}`, { signal })
    return creatorSchema.parse(data)
  },
}
