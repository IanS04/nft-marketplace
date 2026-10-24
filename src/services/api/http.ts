import axios from 'axios'
import { env } from '@/app/env'
import { networkReady } from '@/app/network-ready'
import { sessionStore } from './session-store'
import { toApiError } from './errors'

export const http = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: 8_000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use(async (config) => {
  // Nada sai antes dos mocks estarem interceptando (o app já renderizou; só a rede espera).
  // O timeout do Axios só começa quando a requisição sai de fato, então a espera não o consome.
  await networkReady
  const token = sessionStore.getAccessToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Request-Id', crypto.randomUUID())
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error) // cancelamento ≠ falha

    const apiError = toApiError(error)

    if (
      apiError.status === 401 &&
      (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'UNAUTHENTICATED') &&
      axios.isAxiosError(error)
    ) {
      const sent = String(error.config?.headers?.get('Authorization') ?? '').replace('Bearer ', '')
      if (sent) sessionStore.markExpired(sent)
    }

    return Promise.reject(apiError)
  },
)