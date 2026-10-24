import { useMutation, useQuery } from '@tanstack/react-query'
import { getIdempotencyKey } from '@/lib/idempotency'
import { ordersApi } from '@/services/api/endpoints/account'
import type { CreateOrderInput, UserId } from '@/types'
import { NO_USER_KEY, useUserScope } from '@/features/account/hooks/use-user-scope'
import { useRealtimeStatus } from '@/realtime/status'

export const orderScope = (userId: UserId) => `order:${userId}`

/**
 * Criação idempotente: a chave nasce do CONTEÚDO da tentativa. Clique repetido, reenvio após
 * timeout ou após refresh mandam a mesma chave → o servidor devolve o mesmo pedido.
 * (Sem retry automático do Query: o reenvio é explícito, no fluxo de confirmação.)
 */
export function useCreateOrder() {
  const { user } = useUserScope()
  return useMutation({
    mutationFn: (input: CreateOrderInput) => {
      if (!user) throw new Error('Sessão ausente.')
      return ordersApi.create(input, getIdempotencyKey(orderScope(user.id), input))
    },
  })
}

const FALLBACK_POLL_MS = 5_000

/**
 * Acompanha o pedido. Fonte principal: o evento order.updated (Socket.IO) invalida esta query.
 * Rede de segurança: se o tempo real estiver fora, consulta a cada 5s enquanto pendente.
 */
export function useOrder(orderId: string) {
  const realtime = useRealtimeStatus()
  const { keys, enabled } = useUserScope()
  return useQuery({
    queryKey: keys?.order(orderId) ?? NO_USER_KEY,
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    enabled,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' && realtime !== 'connected' ? FALLBACK_POLL_MS : false,
  })
}

/** Pedido em andamento bloqueia uma nova compra (evita duplicar após refresh/reconexão). */
export function usePendingOrders() {
  const { keys, enabled } = useUserScope()
  return useQuery({
    queryKey: keys?.pendingOrders ?? NO_USER_KEY,
    queryFn: ({ signal }) => ordersApi.listPending(signal),
    enabled,
    staleTime: 0,
  })
}
