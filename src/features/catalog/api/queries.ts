import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import { nftsApi } from '@/services/api/endpoints/nfts'
import type { NftListQuery } from '@/types'

/**
 * Cada combinação de filtros tem sua chave: respostas fora de ordem caem na chave certa e,
 * como o `signal` é repassado ao Axios, a requisição obsoleta é cancelada ao trocar de filtro.
 * keepPreviousData mantém a grade anterior visível (esmaecida) enquanto a nova página carrega.
 */
export const nftListQueryOptions = (query: NftListQuery) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(query),
    queryFn: ({ signal }) => nftsApi.list(query, signal),
    placeholderData: keepPreviousData,
  })

export const featuredNftsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.nfts.featured(),
    queryFn: ({ signal }) => nftsApi.featured(signal),
    staleTime: 5 * 60_000,
  })
