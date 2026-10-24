import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import { creatorsApi } from '@/services/api/endpoints/creators'

export const creatorsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.creators.list(),
    queryFn: ({ signal }) => creatorsApi.list(signal),
  })

export const creatorDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.creators.detail(id),
    queryFn: ({ signal }) => creatorsApi.get(id, signal),
  })
