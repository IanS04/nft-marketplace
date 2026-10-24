import type { QueryClient } from '@tanstack/react-query'
import { sessionStore, type SessionState } from '@/services/api/session-store'
import { PRIVATE_CACHE_PREFIX } from './query-keys'

const clearedListeners = new Set<() => void>()

/** Gancho chamado quando os dados privados são descartados (a Etapa 7 encerra as subscriptions do socket aqui). */
export function onPrivateDataCleared(listener: () => void): () => void {
  clearedListeners.add(listener)
  return () => { clearedListeners.delete(listener) }
}

export function clearPrivateData(queryClient: QueryClient): void {
  void queryClient.cancelQueries({ queryKey: PRIVATE_CACHE_PREFIX })
  queryClient.removeQueries({ queryKey: PRIVATE_CACHE_PREFIX })
  queryClient.getMutationCache().clear()
  clearedListeners.forEach((listener) => listener())
}

const userIdOf = (state: SessionState) => state.session?.user.id ?? null

/**
 * Logout ou troca de usuário → descarta o cache privado (['user', …]).
 * Expiração do MESMO usuário mantém o cache: o contexto é retomado após novo login.
 */
export function bindSessionToCache(queryClient: QueryClient): () => void {
  let previousUserId = userIdOf(sessionStore.getSnapshot())
  return sessionStore.subscribe(() => {
    const nextUserId = userIdOf(sessionStore.getSnapshot())
    if (previousUserId && previousUserId !== nextUserId) clearPrivateData(queryClient)
    previousUserId = nextUserId
  })
}
