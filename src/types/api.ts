export const IDEMPOTENCY_HEADER = 'Idempotency-Key' as const

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',      // 422: fieldErrors preenchido
  'INVALID_CREDENTIALS',   // 401: login com e-mail/senha incorretos
  'UNAUTHENTICATED',       // 401: sem token / token inválido
  'SESSION_EXPIRED',       // 401: expirou durante navegação/checkout
  'FORBIDDEN',             // 403
  'NOT_FOUND',             // 404
  'CONFLICT',              // 409: e-mail/usuário já cadastrado
  'AVAILABILITY_CONFLICT', // 409: edição esgotada / quantidade acima do disponível
  'IDEMPOTENCY_CONFLICT',  // 409: mesma chave, conteúdo diferente
  'COUPON_INVALID',        // 422
  'COUPON_EXPIRED',        // 422
  'QUOTE_STALE',           // 409: preço/taxa mudou, exige nova confirmação
  'WALLET_REJECTED',       // 409: a carteira (simulada) recusou a conexão
  'TRANSIENT',             // 5xx: retryable
  'NETWORK_ERROR',         // sem resposta (offline/timeout)
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  status: number
  retryable: boolean
  requestId?: string
  fieldErrors?: Record<string, string[]>
  details?: Record<string, unknown>
}

export interface PageInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  items: T[]
  pageInfo: PageInfo
}