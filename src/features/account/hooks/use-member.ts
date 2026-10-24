import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import { ordersApi } from '@/services/api/endpoints/account'
import { activityApi, downloadsApi, offersApi, supportApi } from '@/services/api/endpoints/member'
import type { CreateSupportTicketInput, DownloadItem, SupportTicket } from '@/types'
import { NO_USER_KEY, useUserScope } from './use-user-scope'

/*
 * Atividade e arquivos mudam por fora desta tela (um pedido liquida pelo socket, um download
 * acontece em outra aba). staleTime 0: toda visita confere com o servidor, mostrando o cache antes.
 */

export function useActivity() {
  const { keys, enabled } = useUserScope()
  return useQuery({
    queryKey: keys?.activity ?? NO_USER_KEY,
    queryFn: ({ signal }) => activityApi.list(signal),
    enabled,
    staleTime: 0,
  })
}

export function useOffers() {
  const { enabled } = useUserScope()
  return useQuery({ queryKey: queryKeys.offers, queryFn: ({ signal }) => offersApi.list(signal), enabled })
}

export function useDownloads() {
  const { keys, enabled } = useUserScope()
  return useQuery({
    queryKey: keys?.downloads ?? NO_USER_KEY,
    queryFn: ({ signal }) => downloadsApi.list(signal),
    enabled,
    staleTime: 0,
  })
}

/** Registra o download na API e só então entrega o arquivo (o contador vem da resposta). */
export function useDownloadFile() {
  const queryClient = useQueryClient()
  const { keys } = useUserScope()
  return useMutation({
    mutationFn: (id: string) => downloadsApi.request(id),
    onSuccess: ({ item }) => {
      if (!keys) return
      queryClient.setQueryData<DownloadItem[]>(keys.downloads, (list) => list?.map((f) => (f.id === item.id ? item : f)))
      void queryClient.invalidateQueries({ queryKey: keys.activity })
    },
  })
}

export function useSupportTickets() {
  const { keys, enabled } = useUserScope()
  return useQuery({
    queryKey: keys?.supportTickets ?? NO_USER_KEY,
    queryFn: ({ signal }) => supportApi.list(signal),
    enabled,
  })
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient()
  const { keys } = useUserScope()
  return useMutation({
    mutationFn: (input: CreateSupportTicketInput) => supportApi.create(input),
    onSuccess: (ticket) => {
      if (!keys) return
      queryClient.setQueryData<SupportTicket[]>(keys.supportTickets, (list = []) => [ticket, ...list])
      void queryClient.invalidateQueries({ queryKey: keys.activity })
    },
  })
}

/** Pedidos do usuário (o formulário de suporte permite relacionar um deles). */
export function useOrders() {
  const { keys, enabled } = useUserScope()
  return useQuery({
    queryKey: keys ? [...keys.orders, 'all'] : NO_USER_KEY,
    queryFn: ({ signal }) => ordersApi.list(signal),
    enabled,
  })
}
