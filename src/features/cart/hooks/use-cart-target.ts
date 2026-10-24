import { useMemo } from 'react'
import { queryKeys } from '@/app/query-keys'
import { getGuestCartId } from '@/lib/guest-cart'
import type { CartRef } from '@/services/api/endpoints/cart'
import { useSession } from '@/features/auth/hooks/use-session'

export interface CartTarget {
  key: readonly unknown[]
  ref: CartRef
  enabled: boolean
}

/**
 * Qual carrinho a tela usa:
 * - autenticado → ['user', id, 'cart'] (privado: some do cache no logout/troca de usuário);
 * - sessão expirada → o mesmo, mas sem buscar (mostra o que já estava em cache até o novo login);
 * - visitante → ['cart', 'guest', guestCartId].
 */
export function useCartTarget(): CartTarget {
  const { status, session } = useSession()
  return useMemo<CartTarget>(() => {
    if (session && status !== 'anonymous') {
      return { key: queryKeys.user(session.user.id).cart, ref: { kind: 'user' }, enabled: status === 'authenticated' }
    }
    const guestCartId = getGuestCartId()
    return { key: queryKeys.guestCart(guestCartId), ref: { kind: 'guest', guestCartId }, enabled: true }
  }, [status, session])
}
