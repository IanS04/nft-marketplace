import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import { nftsApi } from '@/services/api/endpoints/nfts'
import type { NftId } from '@/types'

export const nftDetailQueryOptions = (id: NftId) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(id),
    queryFn: ({ signal }) => nftsApi.get(id, signal),
  })
