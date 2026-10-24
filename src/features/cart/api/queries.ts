import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import { cartApi } from '@/services/api/endpoints/cart'
import type { Blockchain, Cart } from '@/types'
import type { CartTarget } from '../hooks/use-cart-target'

export const DEFAULT_NETWORK: Blockchain = 'ethereum'

export const cartQueryOptions = (target: CartTarget) =>
  queryOptions({
    queryKey: target.key,
    queryFn: ({ signal }) => cartApi.get(target.ref, signal),
    enabled: target.enabled,
  })

/**
 * Cotação da versão atual do carrinho: muda a versão → chave nova → cotação nova.
 * keepPreviousData: ao mudar uma quantidade, o resumo antigo fica visível (esmaecido) até a nova chegar.
 */
export const quoteQueryOptions = (target: CartTarget, cart: Cart | undefined, network: Blockchain = DEFAULT_NETWORK) =>
  queryOptions({
    queryKey: queryKeys.quote(target.key, cart?.version ?? -1, network),
    queryFn: ({ signal }) => cartApi.quote(target.ref, network, signal),
    enabled: target.enabled && !!cart && cart.items.length > 0,
    placeholderData: keepPreviousData,
  })
