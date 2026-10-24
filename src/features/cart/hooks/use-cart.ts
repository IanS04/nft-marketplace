import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/services/api/errors'
import { cartApi, type CartRef } from '@/services/api/endpoints/cart'
import type { AddCartItemInput, Blockchain, Cart, CartItemId } from '@/types'
import { cartQueryOptions, quoteQueryOptions } from '../api/queries'
import { useCartTarget } from './use-cart-target'

export function useCart() {
  const target = useCartTarget()
  return useQuery(cartQueryOptions(target))
}

export function useQuote(cart: Cart | undefined, network?: Blockchain) {
  const target = useCartTarget()
  return useQuery(quoteQueryOptions(target, cart, network))
}

/**
 * Toda mutation de carrinho devolve o carrinho atualizado: ele vai direto para o cache
 * (sem refetch) e a nova `version` dispara uma nova cotação.
 */
function useCartMutation<TVars>(request: (ref: CartRef, vars: TVars) => Promise<Cart>) {
  const target = useCartTarget()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: TVars) => request(target.ref, vars),
    onSuccess: (cart) => queryClient.setQueryData(target.key, cart),
    onError: (error) => {
      // Conflito de disponibilidade: o estado do servidor mudou, então relemos o carrinho.
      if (isApiError(error) && error.status === 409) void queryClient.invalidateQueries({ queryKey: target.key })
    },
  })
}

export const useAddToCart = () =>
  useCartMutation((ref, input: AddCartItemInput) => cartApi.addItem(ref, input))

export const useUpdateCartItem = () =>
  useCartMutation((ref, { id, quantity }: { id: CartItemId; quantity: number }) => cartApi.updateItem(ref, id, quantity))

export const useRemoveCartItem = () =>
  useCartMutation((ref, id: CartItemId) => cartApi.removeItem(ref, id))

export const useApplyCoupon = () =>
  useCartMutation((ref, code: string) => cartApi.applyCoupon(ref, code))

export const useRemoveCoupon = () =>
  useCartMutation<void>((ref) => cartApi.removeCoupon(ref))
