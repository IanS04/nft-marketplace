import { useQuery } from '@tanstack/react-query'
import { nftListQueryOptions } from '../api/queries'
import { useCatalogSearch } from './use-catalog-search'

/** Listagem da URL atual. Vários componentes podem chamar: todos compartilham a mesma query em cache. */
export function useNftList() {
  const { query } = useCatalogSearch()
  return useQuery(nftListQueryOptions(query))
}
