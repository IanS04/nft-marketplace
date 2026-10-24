import { getRouteApi } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { toListQuery, type NftSearch } from '@/schemas/nft'

const routeApi = getRouteApi('/')

export const CATALOG_ANCHOR = 'catalogo'

export type CatalogFilters = Partial<Omit<NftSearch, 'page'>>

/** Estado do catálogo = search params da URL. Sobrevive a refresh, link compartilhado e voltar/avançar. */
export function useCatalogSearch() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const query = useMemo(() => toListQuery(search), [search])

  /** Qualquer mudança de filtro volta para a página 1. */
  const setFilters = useCallback(
    (patch: CatalogFilters) =>
      navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), resetScroll: false }),
    [navigate],
  )

  /** `replace` corrige a URL sem criar entrada no histórico (ex.: página além do fim). */
  const goToPage = useCallback(
    (page: number, { replace = false } = {}) =>
      navigate({ search: (prev) => ({ ...prev, page }), replace, resetScroll: false }),
    [navigate],
  )

  const clearFilters = useCallback(
    () =>
      navigate({
        search: (prev) => ({ tab: prev.tab, sort: prev.sort, page: 1 }),
        resetScroll: false,
      }),
    [navigate],
  )

  const hasActiveFilters =
    !!search.q || search.categories.length > 0 || search.networks.length > 0 || !!search.minPrice || !!search.maxPrice

  return { search, query, setFilters, goToPage, clearFilters, hasActiveFilters }
}
