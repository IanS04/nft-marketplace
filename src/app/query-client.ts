import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/services/api/errors'

const MAX_RETRIES = 2

/** Só repete falha transitória (rede/5xx). 4xx nunca é repetido. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false
  return isApiError(error) ? error.retryable : false
}

/** Backoff exponencial com jitter, teto de 4s. */
export function retryDelay(attempt: number): number {
  const base = Math.min(500 * 2 ** attempt, 4_000)
  return base / 2 + Math.random() * (base / 2)
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      // Mutations não repetem sozinhas: duplicar compra é pior que falhar.
      // Reenvio seguro de pedidos acontece por idempotência, de forma explícita.
      mutations: { retry: false },
    },
  })
}

export const queryClient = createQueryClient()