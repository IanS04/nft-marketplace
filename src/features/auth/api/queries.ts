import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/app/query-keys'
import { authApi } from '@/services/api/endpoints/auth'
import type { UserId } from '@/types'

/** Validação da sessão no servidor. Um 401 aqui faz o interceptor marcar a sessão como expirada. */
export const sessionQueryOptions = (userId: UserId) =>
  queryOptions({
    queryKey: queryKeys.user(userId).session,
    queryFn: ({ signal }) => authApi.getSession(signal),
  })
