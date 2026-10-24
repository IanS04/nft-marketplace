import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { queryKeys } from '@/app/query-keys'
import { useSession } from '@/features/auth/hooks/use-session'
import { getGuestCartId, hasGuestCartId, resetGuestCartId } from '@/lib/guest-cart'
import { cartApi } from '@/services/api/endpoints/cart'
import type { Cart } from '@/types'

/** Evita dois merges simultâneos do mesmo carrinho (ex.: efeitos rodando duas vezes no StrictMode). */
let mergeInFlight: string | null = null

/**
 * Visitante → login: os itens do carrinho de visitante vão para o carrinho da conta (POST /cart/merge).
 *
 * Depende do ESTADO, não da transição: sessão autenticada + carrinho de visitante ainda guardado no
 * navegador = merge pendente. Se a página recarregar no meio do merge, ele é retomado no próximo
 * carregamento (o id do visitante só é apagado depois do sucesso).
 */
export function CartSessionBridge() {
  const { status, session } = useSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (status !== 'authenticated' || !session || !hasGuestCartId()) return
    const guestCartId = getGuestCartId()
    if (mergeInFlight === guestCartId) return
    mergeInFlight = guestCartId

    const guestKey = queryKeys.guestCart(guestCartId)
    const userKey = queryKeys.user(session.user.id).cart
    const hadItems = (queryClient.getQueryData<Cart>(guestKey)?.itemCount ?? 0) > 0

    cartApi
      .merge(guestCartId)
      .then((cart) => {
        queryClient.setQueryData(userKey, cart)
        // Refaz qualquer leitura do carrinho do usuário que tenha saído antes do merge.
        void queryClient.invalidateQueries({ queryKey: userKey })
        queryClient.removeQueries({ queryKey: guestKey })
        resetGuestCartId()
        if (hadItems) toast.success('Os itens do seu carrinho foram mantidos.')
      })
      .catch(() => {
        // O id do visitante é mantido: o merge é tentado de novo no próximo carregamento/login.
        toast.error('Não foi possível juntar o carrinho de visitante à sua conta.')
      })
      .finally(() => { mergeInFlight = null })
  }, [status, session, queryClient])

  return null
}
